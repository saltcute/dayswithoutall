import { describe, expect, it } from "vitest";
import { negotiate, parseAcceptLanguage, readCookie, templateKey, translate, translateAuto } from "../shared/i18n";

describe("locale negotiation", () => {
  it("parses Accept-Language by q", () => {
    expect(parseAcceptLanguage("en;q=0.5, ja-JP, zh-CN;q=0.8")).toEqual(["ja-JP", "zh-CN", "en"]);
  });
  it("maps all Chinese variants to Simplified", () => {
    expect(negotiate(["zh-TW"])).toBe("zh-Hans");
    expect(negotiate(["zh-Hans-CN"])).toBe("zh-Hans");
    expect(negotiate(["zh"])).toBe("zh-Hans");
  });
  it("picks the first supported, else English", () => {
    expect(negotiate(["fr-FR", "ja-JP", "en"])).toBe("ja");
    expect(negotiate(["fr", "de"])).toBe("en");
    expect(negotiate([null, undefined, ""])).toBe("en");
  });
  it("reads cookies", () => {
    expect(readCookie("a=1; lang=ja; b=2", "lang")).toBe("ja");
    expect(readCookie("a=1", "lang")).toBeNull();
  });
});

describe("translation", () => {
  const dict = { "NETWORK ERROR": "网络错误", "count #{0}": "第{0}次清点", "{0} / {1}": "{0}/{1}", "Day {n}": "第{n}天", "code {0}": "错误码 {0}" };
  it("translates exact strings and falls back to source", () => {
    expect(translateAuto(dict, "NETWORK ERROR")).toBe("网络错误");
    expect(translateAuto(dict, "unknown")).toBe("unknown");
  });
  it("templates numbers", () => {
    expect(templateKey("count #1,204")).toEqual({ key: "count #{0}", args: ["1,204"] });
    expect(templateKey("RATING 15.00 / -97%")).toEqual({ key: "RATING {0} / -{1}%", args: ["15.00", "97"] });
    expect(translateAuto(dict, "count #1,204")).toBe("第1,204次清点");
    expect(translateAuto(dict, "12 / 60")).toBe("12/60");
    expect(translateAuto(dict, "code 6401")).toBe("错误码 6401");
  });
  it("substitutes named variables", () => {
    expect(translate(dict, "Day {n}", { n: 9 })).toBe("第9天");
    expect(translate({}, "Day {n}", { n: 9 })).toBe("Day 9");
  });
});
