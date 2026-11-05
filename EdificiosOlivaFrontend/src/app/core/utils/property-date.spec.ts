import { todayInPropertyZone } from './property-date';

describe('todayInPropertyZone', () => {
  it('uses the property date when UTC has already rolled over', () => {
    // 2030-01-11 02:00 UTC is still 2030-01-10 22:00 in Santo Domingo (UTC-4).
    expect(todayInPropertyZone(new Date('2030-01-11T02:00:00Z'))).toBe('2030-01-10');
  });

  it('returns YYYY-MM-DD', () => {
    expect(todayInPropertyZone(new Date('2030-06-05T15:00:00Z'))).toBe('2030-06-05');
  });
});
