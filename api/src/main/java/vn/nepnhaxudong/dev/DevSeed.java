package vn.nepnhaxudong.dev;

import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.nepnhaxudong.common.Lang;
import vn.nepnhaxudong.common.LocalizedList;
import vn.nepnhaxudong.common.LocalizedText;
import vn.nepnhaxudong.press.PressMentionRepository;
import vn.nepnhaxudong.press.PressMentionRequest;
import vn.nepnhaxudong.press.PressService;
import vn.nepnhaxudong.product.PackagingDto;
import vn.nepnhaxudong.product.ProductRepository;
import vn.nepnhaxudong.product.ProductRequest;
import vn.nepnhaxudong.product.ProductService;
import vn.nepnhaxudong.site.BrandSettings;
import vn.nepnhaxudong.site.ContactSettings;
import vn.nepnhaxudong.site.SiteSettingKey;
import vn.nepnhaxudong.site.SiteSettingRepository;
import vn.nepnhaxudong.site.SiteSettingService;
import vn.nepnhaxudong.site.SiteSettingValue;
import vn.nepnhaxudong.site.SocialSettings;
import vn.nepnhaxudong.story.StoryRepository;
import vn.nepnhaxudong.story.StoryRequest;
import vn.nepnhaxudong.story.StoryService;
import vn.nepnhaxudong.timeline.TimelineEventRepository;
import vn.nepnhaxudong.timeline.TimelineEventRequest;
import vn.nepnhaxudong.timeline.TimelineService;

/**
 * Sample content for local development, so that the website shows something on an empty database.
 * It exists only in the profile {@code dev}. Each part is created only when it is missing (see
 * {@link #run}), so a second start adds nothing. Every sample text starts with {@value #MARK}, the
 * phone numbers are zeros and the addresses are {@code example.com}. It creates no images. The whole
 * seed is one transaction: when a part fails, nothing is kept.
 */
@Component
@Profile("dev")
public class DevSeed implements ApplicationRunner {

  static final String MARK = "[MẪU]";

  private static final Logger LOG = LoggerFactory.getLogger(DevSeed.class);

  private final ProductRepository productRepository;
  private final TimelineEventRepository timelineRepository;
  private final PressMentionRepository pressRepository;
  private final StoryRepository storyRepository;
  private final SiteSettingRepository settingRepository;
  private final ProductService products;
  private final TimelineService timeline;
  private final PressService press;
  private final StoryService stories;
  private final SiteSettingService settings;

  public DevSeed(
      ProductRepository productRepository,
      TimelineEventRepository timelineRepository,
      PressMentionRepository pressRepository,
      StoryRepository storyRepository,
      SiteSettingRepository settingRepository,
      ProductService products,
      TimelineService timeline,
      PressService press,
      StoryService stories,
      SiteSettingService settings) {
    this.productRepository = productRepository;
    this.timelineRepository = timelineRepository;
    this.pressRepository = pressRepository;
    this.storyRepository = storyRepository;
    this.settingRepository = settingRepository;
    this.products = products;
    this.timeline = timeline;
    this.press = press;
    this.stories = stories;
    this.settings = settings;
  }

  /**
   * Each part checks on its own whether it is needed, so a developer who deleted or edited some
   * sample content can start the app again: products, timeline and press only when there are none,
   * a story only when its Vietnamese slug is free, a setting only when its row is missing (an
   * edited setting is never overwritten).
   */
  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    boolean created = false;
    if (productRepository.count() == 0) {
      seedProduct();
      created = true;
    }
    if (timelineRepository.count() == 0) {
      seedTimeline();
      created = true;
    }
    if (pressRepository.count() == 0) {
      seedPress();
      created = true;
    }
    created |= seedStories();
    created |= seedSettings();
    if (created) {
      LOG.info("Sample content for development was created.");
    }
  }

  /** The sample product is created, then shown: a new product is hidden until it is shown. */
  private void seedProduct() {
    var created =
        products.create(
            new ProductRequest(
                0,
                false,
                text("Gạo nếp cái hoa vàng", "Yellow-flower sticky rice"),
                text(
                    "Hạt nếp tròn, dẻo và thơm, trồng ở vùng quê Hải Dương.",
                    "Round, soft and fragrant sticky rice grown in Hai Duong."),
                new LocalizedList(
                    List.of(MARK + " Dẻo", MARK + " Thơm", MARK + " Hạt tròn đều"),
                    List.of(MARK + " Soft", MARK + " Fragrant", MARK + " Even round grains")),
                text(
                    "Ngâm gạo 6 tiếng rồi đồ chín.",
                    "Soak the rice for 6 hours, then steam it."),
                List.of(new PackagingDto(2000, null, null)),
                List.of()));
    products.show(created.id());
  }

  private void seedTimeline() {
    timeline.create(
        new TimelineEventRequest(
            1990,
            null,
            text("Mốc thứ nhất", "First milestone"),
            text("Gia đình bắt đầu trồng nếp.", "The family started growing sticky rice."),
            null));
    timeline.create(
        new TimelineEventRequest(
            2005,
            null,
            text("Mốc thứ hai", "Second milestone"),
            text("Mở rộng ruộng nếp.", "The rice fields grew."),
            null));
    timeline.create(
        new TimelineEventRequest(
            2022,
            null,
            text("Mốc thứ ba", "Third milestone"),
            text("Bán gạo qua mạng.", "Selling rice online."),
            null));
  }

  private void seedPress() {
    press.create(
        new PressMentionRequest(
            "https://example.com/bao-mot",
            MARK + " Báo mẫu một",
            LocalDate.of(2023, 5, 20),
            text("Bài báo mẫu thứ nhất", "First sample article"),
            null,
            null));
    press.create(
        new PressMentionRequest(
            "https://example.com/bao-hai",
            MARK + " Báo mẫu hai",
            LocalDate.of(2024, 9, 1),
            text("Bài báo mẫu thứ hai", "Second sample article"),
            null,
            null));
  }

  private boolean seedStories() {
    boolean first =
        publishStory(
            "mau-cau-chuyen-mot",
            "sample-story-one",
            text("Câu chuyện mẫu thứ nhất", "First sample story"),
            text("Tóm tắt câu chuyện thứ nhất.", "Summary of the first story."));
    boolean second =
        publishStory(
            "mau-cau-chuyen-hai",
            "sample-story-two",
            text("Câu chuyện mẫu thứ hai", "Second sample story"),
            text("Tóm tắt câu chuyện thứ hai.", "Summary of the second story."));
    return first || second;
  }

  /** Creates and publishes the story unless a story already has the Vietnamese slug. */
  private boolean publishStory(
      String slugVi, String slugEn, LocalizedText title, LocalizedText excerpt) {
    if (storyRepository.slugTakenByOther(Lang.VI.code(), slugVi, StoryRepository.NEW_STORY_ID)) {
      return false;
    }
    var created =
        stories.create(
            new StoryRequest(
                null,
                new LocalizedText(slugVi, slugEn),
                title,
                excerpt,
                new LocalizedText(
                    "<p>" + MARK + " Nội dung mẫu của bài viết.</p>",
                    "<p>" + MARK + " Sample content of the story.</p>")));
    stories.publish(created.id());
    return true;
  }

  private boolean seedSettings() {
    boolean contact =
        saveIfMissing(
            SiteSettingKey.CONTACT,
            new ContactSettings(
                "0000 000 000",
                "0000000000",
                "https://example.com/messenger",
                text("Địa chỉ mẫu, Hải Dương", "Sample address, Hai Duong"),
                "https://example.com/ban-do",
                text("8:00 - 17:00 hằng ngày", "8 am - 5 pm every day")));
    boolean social =
        saveIfMissing(
            SiteSettingKey.SOCIAL,
            new SocialSettings(
                "https://example.com/facebook",
                "https://example.com/youtube",
                "https://example.com/tiktok"));
    boolean brand =
        saveIfMissing(
            SiteSettingKey.BRAND,
            new BrandSettings(text("Hạt nếp quê nhà", "Sticky rice from home")));
    return contact || social || brand;
  }

  /** Saves the setting only when its row is missing; a setting that exists is never changed. */
  private boolean saveIfMissing(SiteSettingKey key, SiteSettingValue value) {
    if (settingRepository.findBySettingKey(key.code()).isPresent()) {
      return false;
    }
    settings.save(key, value);
    return true;
  }

  /** A sample text in both languages; both start with the mark. */
  private static LocalizedText text(String vi, String en) {
    return new LocalizedText(MARK + " " + vi, MARK + " " + en);
  }
}
