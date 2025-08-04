import { formatVehicleType, getVehicleIconAndColor } from '../utils/formatVehicleType';

describe('formatVehicleType', () => {
  it('returns empty string when undefined', () => {
    expect(formatVehicleType(undefined)).toBe('');
  });

  it('formats array of types', () => {
    expect(formatVehicleType(['Moto', 'Taxi'])).toBe('moto, taxi');
  });

  it('formats single string', () => {
    expect(formatVehicleType('Voiture')).toBe('voiture');
  });
});

describe('getVehicleIconAndColor', () => {
  it('returns default icon for unknown type', () => {
    const result = getVehicleIconAndColor('unknown');
    expect(result).toEqual({ icon: 'fas fa-car', color: 'text-purple-500' });
  });

  it('returns the icon for moto', () => {
    const result = getVehicleIconAndColor('moto');
    expect(result).toEqual({ icon: 'fas fa-motorcycle', color: 'text-blue-500' });
  });
});
