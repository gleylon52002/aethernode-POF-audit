import { z } from 'zod';
import { defineHandler } from '@main/ipc/router';
import { IPC } from '@shared/constants';
import {
  listProfiles,
  saveProfile,
  removeProfile,
  listCardSummaries,
  saveCard,
  removeCard,
  getCardForFill,
} from '@main/services/autofill-service';

// Otomatik doldurma IPC'leri.
// Profiller serbest; kart işlemleri kasa kilidine tabidir (servis fırlatır,
// router hata mesajını Result olarak döner).

const profileFieldsSchema = z.object({
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  addressLine1: z.string().max(300).optional(),
  addressLine2: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(120).optional(),
});

export function registerAutofillHandlers(): void {
  defineHandler({
    channel: IPC.autofill.profiles,
    schema: z.unknown().optional(),
    handle: () => listProfiles(),
  });

  defineHandler({
    channel: IPC.autofill.saveProfile,
    schema: z.object({
      id: z.string().optional(),
      name: z.string().min(1).max(120),
      fields: profileFieldsSchema,
    }),
    handle: (payload) => saveProfile(payload),
  });

  defineHandler({
    channel: IPC.autofill.removeProfile,
    schema: z.object({ id: z.string().min(1) }),
    handle: ({ id }) => {
      removeProfile(id);
      return true;
    },
  });

  defineHandler({
    channel: IPC.autofill.cards,
    schema: z.unknown().optional(),
    handle: async () => listCardSummaries(),
  });

  defineHandler({
    channel: IPC.autofill.saveCard,
    schema: z.object({
      id: z.string().optional(),
      label: z.string().min(1).max(120),
      cardholderName: z.string().max(200),
      pan: z.string().min(8).max(30),
      cvv: z.string().max(6).optional(),
      expiryMonth: z.string().min(1).max(2),
      expiryYear: z.string().min(2).max(4),
    }),
    handle: async (payload) => saveCard(payload),
  });

  defineHandler({
    channel: IPC.autofill.removeCard,
    schema: z.object({ id: z.string().min(1) }),
    handle: async ({ id }) => {
      await removeCard(id);
      return true;
    },
  });

  defineHandler({
    channel: IPC.autofill.cardFill,
    schema: z.object({ id: z.string().min(1) }),
    handle: async ({ id }) => getCardForFill(id),
  });
}
