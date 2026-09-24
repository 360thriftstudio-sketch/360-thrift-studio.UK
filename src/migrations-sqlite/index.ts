import * as migration_20260924_165929_initial from './20260924_165929_initial';

export const migrations = [
  {
    up: migration_20260924_165929_initial.up,
    down: migration_20260924_165929_initial.down,
    name: '20260924_165929_initial'
  },
];
