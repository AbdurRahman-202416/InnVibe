/** Shape of a room record (the static "catalogue" entry, no date information). */
export interface Room {
  id: number;
  roomNumber: string;
  type: 'Single' | 'Double' | 'Deluxe' | 'Suite';
  pricePerNight: number;
  capacity: number; // max number of guests
  description: string;
  image: string; // main photo, path served by the Next.js frontend, e.g. "/images/room-single.jpg"
  gallery: string[]; // photos for the room detail page (first one is the main photo)
  size: number; // square metres
  bed: string;
  view: string;
  amenities: string[];
}

/** A room plus whether it is free for the requested dates */
export interface RoomAvailability extends Room {
  isAvailable: boolean;
}
