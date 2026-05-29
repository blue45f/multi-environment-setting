// CloudFront Function — runtime: cloudfront-js-2.0
//
// 멀티테넌트 PR preview 라우팅.
// 단일 CloudFront 배포 하나로 모든 PR preview를 서빙하기 위해, 요청을 보고
// 어떤 S3 prefix(/web/pr-<n>/)에서 객체를 가져올지 viewer-request 단계에서 결정한다.
// (viewer-request는 캐시 조회 이전에 실행되므로, 캐시 키는 재작성된 URI 기준이 된다.
//  따라서 invalidation 경로도 "/web/pr-<n>/*" 처럼 재작성된 경로를 사용해야 한다.)
//
// 지원하는 두 가지 접근 방식:
//   1) host 기반 (운영 권장): pr-123.preview.example.com  ->  /web/pr-123/...
//   2) path 기반 (도메인 없이 테스트용): d1234.cloudfront.net/pr-123/...  ->  /web/pr-123/...
//
// SPA fallback: 확장자가 없는 경로(예: /dashboard)나 디렉터리(/)는 그 테넌트의
// index.html(앱 셸)로 보낸다. 해시가 박힌 정적 자산(예: app.abc123.js)은 그대로 둔다.

function handler(event) {
  var request = event.request;
  var host = (request.headers.host && request.headers.host.value) || '';
  var label = host.split('.')[0]; // 1) host 기반 tenant 후보 ("pr-123")

  // host가 tenant 형태가 아니면(예: *.cloudfront.net, apex 도메인) 2) path 기반으로 추출
  if (label.indexOf('pr-') !== 0) {
    var seg = request.uri.split('/'); // "/pr-123/a/b" -> ["", "pr-123", "a", "b"]
    if (seg.length > 1 && seg[1].indexOf('pr-') === 0) {
      label = seg[1];
      var rest = seg.slice(2).join('/');
      request.uri = rest === '' ? '/' : '/' + rest;
    }
  }

  // tenant 검증: "pr-" + 숫자만 허용 (상위 prefix 침범/path traversal 방지)
  var number = label.indexOf('pr-') === 0 ? label.substring(3) : '';
  if (!isAllDigits(number)) {
    return {
      statusCode: 404,
      statusDescription: 'Not Found',
      headers: { 'content-type': { value: 'text/plain' } }
    };
  }

  var uri = request.uri;
  if (uri.endsWith('/')) {
    uri += 'index.html';
  } else {
    var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
    if (lastSegment.indexOf('.') === -1) {
      // 확장자 없음 = SPA 라우트 = 앱 셸로 fallback
      uri = '/index.html';
    }
  }

  request.uri = '/web/' + label + uri;
  return request;
}

function isAllDigits(s) {
  if (s.length === 0) {
    return false;
  }
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 48 || c > 57) {
      return false;
    }
  }
  return true;
}
