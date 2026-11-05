package vn.nepnhaxudong.publicapi;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.common.ApiException;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedText;
import vn.nepnhaxudong.media.MediaRepository;
import vn.nepnhaxudong.press.PressMention;
import vn.nepnhaxudong.press.PressMentionRepository;
import vn.nepnhaxudong.product.Product;
import vn.nepnhaxudong.product.ProductRepository;
import vn.nepnhaxudong.site.SiteSettingService;
import vn.nepnhaxudong.story.Story;
import vn.nepnhaxudong.story.StoryRepository;
import vn.nepnhaxudong.story.StoryStatus;
import vn.nepnhaxudong.timeline.TimelineEvent;
import vn.nepnhaxudong.timeline.TimelineEventRepository;

/**
 * Reads the content that the public website shows. It never writes, and it shows only what is
 * public: the products with "Hiện trên web" on, every milestone and article, and the stories that
 * are published.
 */
@Service
public class PublicContentService {

  static final int HOME_STORY_COUNT = 3;
  static final int STORY_PAGE_SIZE = 12;
  /** The last page number whose offset still fits in an int; a bigger page is past the end. */
  static final long LAST_PAGE_WITH_VALID_OFFSET = Integer.MAX_VALUE / STORY_PAGE_SIZE - 1;

  private static final String STORY_NOT_FOUND = "Không tìm thấy bài viết.";

  private final ProductRepository products;
  private final TimelineEventRepository events;
  private final PressMentionRepository mentions;
  private final StoryRepository stories;
  private final MediaRepository media;
  private final SiteSettingService settings;

  public PublicContentService(
      ProductRepository products,
      TimelineEventRepository events,
      PressMentionRepository mentions,
      StoryRepository stories,
      MediaRepository media,
      SiteSettingService settings) {
    this.products = products;
    this.events = events;
    this.mentions = mentions;
    this.stories = stories;
    this.media = media;
    this.settings = settings;
  }

  @Transactional(readOnly = true)
  public HomeDto home(Lang lang) {
    List<Product> productList = products.findAllByVisibleTrueOrderBySortOrderAscIdAsc();
    List<TimelineEvent> eventList = events.findAllByOrderBySortOrderAscIdAsc();
    List<PressMention> mentionList = mentions.findAllByOrderBySortOrderAscIdAsc();
    List<Story> storyList =
        stories.findNewestByStatus(StoryStatus.PUBLISHED, PageRequest.of(0, HOME_STORY_COUNT));

    List<Long> mediaIds = new ArrayList<>();
    productList.forEach(product -> mediaIds.addAll(product.mediaIds()));
    eventList.forEach(event -> mediaIds.add(event.getMediaId()));
    mentionList.forEach(mention -> mediaIds.add(mention.getMediaId()));
    storyList.forEach(story -> mediaIds.add(story.getCoverMediaId()));
    ImageRefs images = ImageRefs.load(media, mediaIds, lang);
    LocalizedText tagline = settings.brand().tagline();

    return new HomeDto(
        lang.code(),
        new BrandDto(PublicText.pick(lang, tagline.vi(), tagline.en())),
        productList.stream().map(product -> ProductPublicDto.from(product, lang, images)).toList(),
        eventList.stream().map(event -> TimelinePublicDto.from(event, lang, images)).toList(),
        mentionList.stream().map(mention -> PressPublicDto.from(mention, lang, images)).toList(),
        storyList.stream().map(story -> StorySummaryDto.from(story, lang, images)).toList(),
        ContactPublicDto.from(settings.contact(), lang),
        SocialPublicDto.from(settings.social()));
  }

  /** One page of published stories, newest first; a page past the end is an empty list. */
  @Transactional(readOnly = true)
  public List<StorySummaryDto> stories(Lang lang, long page) {
    if (page > LAST_PAGE_WITH_VALID_OFFSET) {
      return List.of();
    }
    List<Story> storyList =
        stories.findNewestByStatus(
            StoryStatus.PUBLISHED, PageRequest.of((int) page, STORY_PAGE_SIZE));
    ImageRefs images =
        ImageRefs.load(media, storyList.stream().map(Story::getCoverMediaId).toList(), lang);
    return storyList.stream().map(story -> StorySummaryDto.from(story, lang, images)).toList();
  }

  /**
   * A published story by slug. The Vietnamese page uses the Vietnamese slug only. The English page
   * uses the English slug first, then the Vietnamese slug (a story with no English text shows its
   * Vietnamese text there).
   */
  @Transactional(readOnly = true)
  public StoryDetailDto story(Lang lang, String slug) {
    Optional<Story> found =
        lang == Lang.EN
            ? stories
                .findBySlug(Lang.EN.code(), slug, StoryStatus.PUBLISHED)
                .or(() -> findVietnamese(slug))
            : findVietnamese(slug);
    Story story =
        found.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, STORY_NOT_FOUND));
    ImageRefs images =
        ImageRefs.load(media, Collections.singletonList(story.getCoverMediaId()), lang);
    return StoryDetailDto.from(story, lang, images);
  }

  private Optional<Story> findVietnamese(String slug) {
    return stories.findBySlug(Lang.VI.code(), slug, StoryStatus.PUBLISHED);
  }
}
