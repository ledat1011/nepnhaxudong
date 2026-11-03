package vn.nepnhaxudong.site;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteSettingRepository extends JpaRepository<SiteSetting, Long> {

  Optional<SiteSetting> findBySettingKey(String settingKey);
}
