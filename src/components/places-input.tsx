'use client';

/**
 * Google Places–validated address input (Service Providers Hub spec §3).
 *
 * With NEXT_PUBLIC_GOOGLE_MAPS_API_KEY set: an autocomplete box where the user
 * MUST pick a suggestion — picking stores the place_id in a hidden field; any
 * manual edit clears it (the server rejects transport inquiries without place
 * ids when the key is configured, so typed-only text can't slip through).
 *
 * Without the key (local/dev, or until the user provisions one): falls back to
 * a plain free-text input so the form keeps working end-to-end.
 */
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GPlace {
  place_id?: string;
  formatted_address?: string;
}
interface GAutocomplete {
  addListener(eventName: 'place_changed', handler: () => void): void;
  getPlace(): GPlace;
}
interface GPlacesNamespace {
  Autocomplete: new (
    input: HTMLInputElement,
    opts: { fields: string[]; componentRestrictions?: { country: string } },
  ) => GAutocomplete;
}
declare global {
  interface Window {
    google?: { maps?: { places?: GPlacesNamespace } };
  }
}

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
let loaderPromise: Promise<void> | null = null;

function loadPlaces(): Promise<void> {
  if (!KEY) return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('gmaps-places-loader');
    const poll = () => {
      if (window.google?.maps?.places) resolve();
      else setTimeout(poll, 150);
    };
    if (existing) {
      poll();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-places-loader';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&libraries=places&loading=async`;
    script.async = true;
    script.onload = poll;
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function PlacesInput({
  id,
  name,
  placeIdName,
  label,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  placeIdName: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeId, setPlaceId] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!KEY) return;
    let cancelled = false;
    loadPlaces()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const places = window.google?.maps?.places;
        if (!places) return;
        const ac = new places.Autocomplete(inputRef.current, {
          fields: ['place_id', 'formatted_address'],
          componentRestrictions: { country: 'in' },
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place.place_id && place.formatted_address && inputRef.current) {
            inputRef.current.value = place.formatted_address;
            setPlaceId(place.place_id);
          }
        });
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={KEY ? 'Start typing, then pick a suggestion…' : 'Full address'}
        autoComplete="off"
        onChange={() => setPlaceId('')} // manual edits invalidate the verified pick
        onKeyDown={(e) => {
          // Enter inside the suggestions list must pick, never submit the form.
          if (e.key === 'Enter') e.preventDefault();
        }}
      />
      <input type="hidden" name={placeIdName} value={placeId} />
      {KEY ? (
        placeId ? (
          <p className="text-xs text-success">✓ Verified address (Google Places)</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {ready ? 'Pick the address from the suggestions — typed text alone isn’t routable.' : 'Loading address search…'}
          </p>
        )
      ) : null}
    </div>
  );
}
