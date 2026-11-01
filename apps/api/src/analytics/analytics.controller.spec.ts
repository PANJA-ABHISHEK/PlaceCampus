import { UserRole } from '@placecampus/shared-types';
import { AnalyticsController } from './analytics.controller.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';

describe('AnalyticsController', () => {
  it('restricts every analytics route to placement heads and admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AnalyticsController)).toEqual([
      UserRole.PLACEMENT_HEAD,
      UserRole.ADMIN,
    ]);
  });
});
