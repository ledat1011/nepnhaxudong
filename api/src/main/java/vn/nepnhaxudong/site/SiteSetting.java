package vn.nepnhaxudong.site;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import vn.nepnhaxudong.common.TimestampedEntity;

/**
 * One row of settings of the website, found by its key. The value is a JSON object (as text); the
 * application never stores SQL NULL there.
 */
@Entity
@Table(name = "site_setting")
public class SiteSetting extends TimestampedEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // The Java names are not "key" and "value": those words are function names in HQL.
  @Column(name = "key", nullable = false)
  private String settingKey;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "value", nullable = false)
  private String settingValue;

  protected SiteSetting() {}

  static SiteSetting create(String settingKey, String settingValue) {
    var setting = new SiteSetting();
    setting.settingKey = settingKey;
    setting.settingValue = settingValue;
    return setting;
  }

  public Long getId() {
    return id;
  }

  public String getSettingKey() {
    return settingKey;
  }

  /** The JSON text of the value. */
  public String getSettingValue() {
    return settingValue;
  }

  void setSettingValue(String settingValue) {
    this.settingValue = settingValue;
  }
}
