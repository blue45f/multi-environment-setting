import ky, { HTTPError, type Options } from 'ky'

// 공유 HTTP 클라이언트(ky). 이 SPA는 인증/스토어가 없고, 정적으로 서빙되는
// /env.json 같은 same-origin 자원만 읽는다. 그래서 offhours의 ky 레퍼런스에서
// auth Bearer / 401 refresh 훅은 생략하고, base 옵션(timeout·retry)과 타입드
// JSON 헬퍼·에러 메시지 추출만 남긴다. 향후 API 백엔드가 붙으면 여기에 prefix와
// beforeRequest(Authorization) / afterResponse(401 refresh) 훅을 추가한다.
export const http = ky.create({
  // SPA → same-origin 정적 자원. 쿠키 동봉이 의미는 없지만 offhours와 동일하게
  // 명시해 동작을 예측 가능하게 둔다(same-origin이라 무해).
  credentials: 'same-origin',
  timeout: 15_000,
  // GET 멱등 호출만 네트워크 흔들림에 대해 짧게 재시도한다.
  retry: { limit: 1, methods: ['get'] },
})

export { HTTPError }
export type { Options }

/**
 * ky 호출의 JSON 본문을 타입 안전하게 읽는다. 204(No Content)는 undefined.
 * (offhours api.ts의 toJson 헬퍼와 같은 형태.)
 */
export async function toJson<T>(promise: ReturnType<typeof http.get>): Promise<T> {
  const res = await promise
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

/**
 * ky HTTPError / 일반 Error 에서 UI가 보여줄 메시지를 추출한다.
 * HTTPError 는 response 를 들고 있으므로 상태 코드 기반 메시지를 만들고,
 * 가능하면 응답 본문(JSON message)을 우선한다.
 */
export function getErrorMessage(err: unknown, fallback = '요청에 실패했어요'): string {
  if (err instanceof HTTPError) {
    const data = (err as HTTPError & { data?: { message?: string | string[] } }).data
    const msg = data?.message
    if (Array.isArray(msg)) return msg.join(', ')
    if (typeof msg === 'string') return msg
    return `${err.response.url || 'request'}: ${err.response.status}`
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}
