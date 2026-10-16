Pod::Spec.new do |s|
  s.name = 'SpotClipOcr'
  s.version = '0.1.0'
  s.summary = 'Local Apple Vision OCR for SpotClip'
  s.description = 'Recognizes text on the device without a paid API.'
  s.license = { :type => 'MIT' }
  s.author = 'SpotClip'
  s.homepage = 'https://github.com/ddi04078/spotclip'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/ddi04078/spotclip.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'ImageIO'
  s.swift_version = '5.9'
  s.source_files = '**/*.swift'
end
