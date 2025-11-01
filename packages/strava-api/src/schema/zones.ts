export interface PowerZoneRanges {
  zones: ZoneRange[];
}

export interface HeartRateZoneRanges {
  custom_zones: boolean;
  zones: ZoneRange[];
}

export interface ZoneRange {
  min: number;
  max: number;
}

export interface Zones {
  heart_rate: HeartRateZoneRanges;
  power: PowerZoneRanges;
}
