'use client';

import Image from 'next/image';
import { useState } from 'react';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Pricing } from '@/lib/types';
import Icon from './Icon';

interface BookingSummaryProps {
  type: string;
  roomNumber: string;
  image: string;
  amenities: string[];
  guests: number;
  checkIn: string;
  checkOut: string;
  pricing: Pricing;
  /** How many rooms of this type are still free for these dates (drives the "only N left" notice). */
  roomsLeft: number;
}

type OpenModal = 'price' | 'policy' | null;

/**
 * Sticky booking summary beside the checkout form, like big travel sites:
 * photo, stay details, a one-line total, and two links that open popups
 * ("Price details" and "Cancellation policy") so the page itself stays short.
 */
export default function BookingSummary({
  type,
  roomNumber,
  image,
  amenities,
  guests,
  checkIn,
  checkOut,
  pricing,
  roomsLeft,
}: BookingSummaryProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null);

  const linkClasses =
    'min-h-11 cursor-pointer text-sm font-semibold text-gold-ink underline underline-offset-4 hover:text-ink';

  return (
    <aside className="border border-line bg-surface lg:sticky lg:top-24 overflow-hidden rounded-lg">
      <div className="relative aspect-[16/9]">
        <Image src={image} alt={`${type} room`} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
      </div>

      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">Your stay</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
          {type} · Room {roomNumber}
        </h2>

        {roomsLeft > 0 && roomsLeft <= 2 && (
          <p className="mt-3 border border-gold/40 bg-gold-soft px-3 py-2 text-sm font-semibold text-gold-ink rounded-md">
            Only {roomsLeft} {type.toLowerCase()} room{roomsLeft > 1 ? 's' : ''} left for these dates
          </p>
        )}

        <dl className="mt-5 flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Check-in</dt>
            <dd className="font-semibold text-ink">{formatDate(checkIn)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Check-out</dt>
            <dd className="font-semibold text-ink">{formatDate(checkOut)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Guests</dt>
            <dd className="font-semibold text-ink">{guests}</dd>
          </div>
        </dl>

        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4 text-sm text-ink">
          {amenities.slice(0, 4).map((amenity) => (
            <li key={amenity} className="flex items-center gap-1.5">
              <Icon path="M5 13l4 4L19 7" className="h-4 w-4 text-gold-ink" />
              {amenity}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm font-semibold text-ink">Total</span>
          <span className="font-display text-3xl font-semibold text-ink">{formatCurrency(pricing.totalAmount)}</span>
        </div>
        <p className="text-right text-xs text-muted">Includes service charge and VAT</p>

        <div className="mt-3 flex flex-wrap gap-x-5">
          <button type="button" onClick={() => setOpenModal('price')} className={linkClasses}>
            Price details
          </button>
          <button type="button" onClick={() => setOpenModal('policy')} className={linkClasses}>
            Cancellation policy
          </button>
        </div>
      </div>

      {openModal === 'price' && (
        <Modal title="Price details" onClose={() => setOpenModal(null)}>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">
                {formatCurrency(pricing.pricePerNight)} × {pricing.nights} night{pricing.nights > 1 ? 's' : ''}
              </dt>
              <dd className="font-semibold text-ink">{formatCurrency(pricing.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Service charge (10%)</dt>
              <dd className="font-semibold text-ink">{formatCurrency(pricing.serviceCharge)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">VAT (15%)</dt>
              <dd className="font-semibold text-ink">{formatCurrency(pricing.vat)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <dt className="font-semibold text-ink">You pay</dt>
              <dd className="font-display text-3xl font-semibold text-ink">{formatCurrency(pricing.totalAmount)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            VAT is charged on the room rate plus service charge. There are no other fees.
          </p>
        </Modal>
      )}

      {openModal === 'policy' && (
        <Modal title="Cancellation policy" onClose={() => setOpenModal(null)}>
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-ink">
            <li className="flex gap-2">
              <Icon path="M5 13l4 4L19 7" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Free cancellation up to 24 hours before check-in.
            </li>
            <li className="flex gap-2">
              <Icon path="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" />
              Later cancellations are charged the first night.
            </li>
            <li className="flex gap-2">
              <Icon path="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" />
              No-shows are charged the full stay.
            </li>
          </ul>
        </Modal>
      )}
    </aside>
  );
}
