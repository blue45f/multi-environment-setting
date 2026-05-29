import { describe, it, expect } from 'vitest';
import { runtimeConfigSchema } from '../../env.schema';

// 단위 테스트(pnpm test → vitest). 배포 게이트의 일부이므로 가볍고 빠르게 유지한다.
describe('runtimeConfigSchema', () => {
  it('정상 config를 통과시킨다', () => {
    const ok = {
      stage: 'preview',
      apiBaseUrl: 'https://api-preview.example.com',
      sentryEnvironment: 'preview',
      featureFlagClientKey: 'public-preview-key',
    };
    expect(() => runtimeConfigSchema.parse(ok)).not.toThrow();
  });

  it('apiBaseUrl이 URL이 아니면 거부한다', () => {
    const bad = {
      stage: 'preview',
      apiBaseUrl: 'not-a-url',
      sentryEnvironment: 'preview',
      featureFlagClientKey: 'public-preview-key',
    };
    expect(() => runtimeConfigSchema.parse(bad)).toThrow();
  });

  it('알 수 없는 stage를 거부한다', () => {
    const bad = {
      stage: 'qa',
      apiBaseUrl: 'https://api.example.com',
      sentryEnvironment: 'qa',
      featureFlagClientKey: 'k',
    };
    expect(() => runtimeConfigSchema.parse(bad)).toThrow();
  });
});
