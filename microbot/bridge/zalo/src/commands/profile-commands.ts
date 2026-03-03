/**
 * Profile/account command handlers — 9 commands.
 * Maps to openzca `me` subcommands.
 * Reference: openzca cli.ts line 4425-4580
 */

import { Gender, type API } from 'zca-js';
import type { BridgeCommand } from '../command-handler.js';

export async function handleProfileCommand(
  api: API,
  cmd: BridgeCommand,
): Promise<unknown> {
  switch (cmd.type) {
    // Account info (cli.ts line 4434)
    case 'myInfo':
      return api.fetchAccountInfo();

    // Own user ID (cli.ts line 4449)
    case 'myId':
      return api.getOwnId();

    // Update profile (cli.ts line 4459-4512)
    case 'myUpdate': {
      const current = await api.fetchAccountInfo();
      const profile = (current as any)?.profile || current;

      const name = cmd.displayName
        ? String(cmd.displayName)
        : String(
            profile.displayName ||
              profile.zaloName ||
              profile.username ||
              '',
          );

      let gender =
        Number(profile.gender) === Gender.Female ? Gender.Female : Gender.Male;
      if (cmd.gender) {
        const g = String(cmd.gender).toLowerCase();
        if (g === 'male') gender = Gender.Male;
        else if (g === 'female') gender = Gender.Female;
        else throw new Error('Gender must be "male" or "female"');
      }

      const dob = cmd.dob
        ? String(cmd.dob)
        : typeof profile.sdob === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(profile.sdob)
          ? profile.sdob
          : '1970-01-01';

      return api.updateProfile({ profile: { name, dob, gender } } as any);
    }

    // Change avatar (cli.ts line 4522)
    case 'myAvatar':
      return api.changeAccountAvatar(String(cmd.filePath));

    // List avatars (cli.ts line 4533)
    case 'myAvatars':
      return api.getAvatarList();

    // Delete avatar (cli.ts line 4543)
    case 'myDeleteAvatar':
      return api.deleteAvatar(String(cmd.id));

    // Reuse previous avatar (cli.ts line 4553)
    case 'myReuseAvatar':
      return api.reuseAvatar(String(cmd.id));

    // Set online status (cli.ts line 4568)
    case 'myStatus':
      return api.updateActiveStatus(
        String(cmd.status).toLowerCase() === 'online',
      );

    // Last online time (cli.ts line 4578)
    case 'lastOnline':
      return api.lastOnline(String(cmd.userId));

    default:
      throw new Error(`Unknown profile command: ${cmd.type}`);
  }
}
