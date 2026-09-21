import { enOffline } from './offline.en';
import { enFarms } from './farms.en';
import { enMoney } from './money.en';
import { enRecords } from './records.en';
import { enAi } from './ai.en';
import { enProfile } from './profile.en';
import { enPlanning } from './planning.en';
import { enIot } from './iot.en';

/** All per-area English dictionaries, merged into `en`. */
export const enAreas = {
  ...enOffline,
  ...enFarms,
  ...enMoney,
  ...enRecords,
  ...enAi,
  ...enProfile,
  ...enPlanning,
  ...enIot,
} as const;
