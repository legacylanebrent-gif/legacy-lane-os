// Approved icon library for Template #1 structured sections (Phase 4B).
// Icons are a platform-controlled allowlist — tenants reference keys, never
// raw markup. Renders nothing for absent/unapproved keys.
import React from 'react';
import { Users, Shield, Heart, Star, Package, Truck, Tag, Camera, Award, Phone, Check, Clock, Map, Key, Briefcase, Handshake, Sparkles, Search, DollarSign, Archive, Home, Wrench, Calendar, ClipboardList } from 'lucide-react';

const MAP = {
  users: Users, shield: Shield, heart: Heart, star: Star, package: Package,
  truck: Truck, tag: Tag, camera: Camera, award: Award, phone: Phone,
  check: Check, clock: Clock, map: Map, key: Key, briefcase: Briefcase,
  handshake: Handshake, sparkles: Sparkles, search: Search, dollar: DollarSign,
  archive: Archive, home: Home, wrench: Wrench, calendar: Calendar, clipboard: ClipboardList
};

export default function IconBadge({ icon, className }) {
  const Icon = MAP[icon];
  if (!Icon) return null;
  return <Icon className={className || 'w-6 h-6'} aria-hidden="true" />;
}