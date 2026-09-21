import { swOffline } from './offline.sw';
import { swFarms } from './farms.sw';
import { swMoney } from './money.sw';
import { swRecords } from './records.sw';
import { swAi } from './ai.sw';
import { swProfile } from './profile.sw';
import { swPlanning } from './planning.sw';
import { swIot } from './iot.sw';

/** All per-area Swahili dictionaries, merged into `sw`. */
export const swAreas = {
  ...swOffline,
  ...swFarms,
  ...swMoney,
  ...swRecords,
  ...swAi,
  ...swProfile,
  ...swPlanning,
  ...swIot,
};
