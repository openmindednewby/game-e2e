import { desktop, deviceDescriptor, gameProjects, phone } from './devices';

describe('phone', () => {
  it('with no size, is the Galaxy S5 touch descriptor at 360x640', () => {
    const result = phone();

    expect([result.viewport, result.isMobile, result.hasTouch, 'defaultBrowserType' in result]).toEqual([{ width: 360, height: 640 }, true, true, false]);
  });

  it('with an explicit scale factor, overrides the descriptor scale factor', () => {
    const result = phone(390, 844, 2);

    expect([result.screen, result.deviceScaleFactor]).toEqual([{ width: 390, height: 844 }, 2]);
  });
});

describe('desktop', () => {
  it('with no size, is Desktop Chrome at 1280x720 and scale factor 1', () => {
    const result = desktop();

    expect([result.viewport, result.isMobile, result.deviceScaleFactor]).toEqual([{ width: 1280, height: 720 }, false, 1]);
  });
});

describe('gameProjects', () => {
  it('with custom sizes and names, returns a phone then a desktop project', () => {
    const options = { phone: { width: 412, height: 915 }, desktop: { width: 1440, height: 900 }, phoneName: 'mobile', desktopName: 'wide' };

    const result = gameProjects(options);

    expect(result.map((p) => [p.name, p.use.viewport])).toEqual([['mobile', { width: 412, height: 915 }], ['wide', { width: 1440, height: 900 }]]);
  });

  it('with no options, names the projects phone and desktop', () => {
    const result = gameProjects();

    expect(result.map((p) => p.name)).toEqual(['phone', 'desktop']);
  });
});

describe('deviceDescriptor', () => {
  it('with a name Playwright does not know, throws', () => {
    const act = (): unknown => deviceDescriptor('Nokia 3310');

    expect(act).toThrow('no device descriptor named "Nokia 3310"');
  });
});
