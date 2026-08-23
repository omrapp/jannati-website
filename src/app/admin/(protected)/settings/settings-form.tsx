'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { idleSettingsFormState, saveSiteSettings } from './actions';

export type SettingsFormInitial = {
  phone: string;
  whatsapp: string;
  whatsappShow: boolean;
  email: string;
  addressAr: string;
  addressEn: string;
  mapLat: string;
  mapLng: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  xUrl: string;
  youtubeUrl: string;
  legalEntityNameEn: string;
  legalEntityNameAr: string;
  registrationNumber: string;
};

export function SettingsForm({ initial }: { initial: SettingsFormInitial }) {
  const [state, formAction, pending] = useActionState(saveSiteSettings, idleSettingsFormState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Contact</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={initial.phone}
              placeholder="+968 9xxx xxxx"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={initial.email} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              defaultValue={initial.whatsapp}
              placeholder="+968 9xxx xxxx"
            />
          </div>
          <label className="mt-6 flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="whatsappShow" defaultChecked={initial.whatsappShow} />
            Show WhatsApp link on storefront
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressEn">Address (en)</Label>
            <Textarea id="addressEn" name="addressEn" rows={3} defaultValue={initial.addressEn} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressAr">Address (ar)</Label>
            <Textarea
              id="addressAr"
              name="addressAr"
              dir="rtl"
              rows={3}
              defaultValue={initial.addressAr}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Map location</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mapLat">Latitude</Label>
            <Input
              id="mapLat"
              name="mapLat"
              inputMode="decimal"
              defaultValue={initial.mapLat}
              placeholder="23.5880"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mapLng">Longitude</Label>
            <Input
              id="mapLng"
              name="mapLng"
              inputMode="decimal"
              defaultValue={initial.mapLng}
              placeholder="58.3829"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Social links</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instagramUrl">Instagram URL</Label>
            <Input
              id="instagramUrl"
              name="instagramUrl"
              type="url"
              defaultValue={initial.instagramUrl}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="facebookUrl">Facebook URL</Label>
            <Input
              id="facebookUrl"
              name="facebookUrl"
              type="url"
              defaultValue={initial.facebookUrl}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tiktokUrl">TikTok URL</Label>
            <Input id="tiktokUrl" name="tiktokUrl" type="url" defaultValue={initial.tiktokUrl} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="xUrl">X (Twitter) URL</Label>
            <Input id="xUrl" name="xUrl" type="url" defaultValue={initial.xUrl} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="youtubeUrl">YouTube URL</Label>
            <Input id="youtubeUrl" name="youtubeUrl" type="url" defaultValue={initial.youtubeUrl} />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Legal</legend>
        <p className="text-muted-foreground text-sm">
          Used on the Terms of Service page — leave blank until you have real values, the page shows
          a generic placeholder instead.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legalEntityNameEn">Legal entity name (English)</Label>
            <Input
              id="legalEntityNameEn"
              name="legalEntityNameEn"
              defaultValue={initial.legalEntityNameEn}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="legalEntityNameAr">Legal entity name (Arabic)</Label>
            <Input
              id="legalEntityNameAr"
              name="legalEntityNameAr"
              dir="rtl"
              defaultValue={initial.legalEntityNameAr}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="registrationNumber">Commercial registration number</Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              defaultValue={initial.registrationNumber}
            />
          </div>
        </div>
      </fieldset>

      {state.status === 'error' && <p className="text-destructive text-sm">{state.message}</p>}
      {state.status === 'success' && <p className="text-sm text-green-600">{state.message}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
