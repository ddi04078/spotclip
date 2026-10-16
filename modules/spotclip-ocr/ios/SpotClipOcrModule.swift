import ExpoModulesCore
import Vision
import ImageIO

public class SpotClipOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SpotClipOcr")
    AsyncFunction("recognize") { (uri: String) -> String in
      guard let url = URL(string: uri), url.isFileURL else {
        throw NSError(domain: "SpotClipOcr", code: 1, userInfo: [NSLocalizedDescriptionKey: "앱에 선택한 사진 파일이 필요해요."])
      }
      let source = CGImageSourceCreateWithURL(url as CFURL, nil)
      guard let source else { throw NSError(domain: "SpotClipOcr", code: 2) }
      // Bound memory use; apply EXIF orientation before recognition.
      let thumbnailOptions: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: 2400]
      guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbnailOptions as CFDictionary) else {
        throw NSError(domain: "SpotClipOcr", code: 3)
      }
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.recognitionLanguages = ["ko-KR", "en-US"]
      request.usesLanguageCorrection = true
      try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
      return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    }.runOnQueue(DispatchQueue(label: "spotclip.ocr", qos: .userInitiated))
  }
}
