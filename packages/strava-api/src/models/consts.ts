export const ActivityName = {
  AlpineSki: 'AlpineSki',
  BackcountrySki: 'BackcountrySki',
  Canoeing: 'Canoeing',
  Crossfit: 'Crossfit',
  EBikeRide: 'EBikeRide',
  Elliptical: 'Elliptical',
  Hike: 'Hike',
  IceSkate: 'IceSkate',
  InlineSkate: 'InlineSkate',
  Kayaking: 'Kayaking',
  Kitesurf: 'Kitesurf',
  NordicSki: 'NordicSki',
  Ride: 'Ride',
  RockClimbing: 'RockClimbing',
  RollerSki: 'RollerSki',
  Rowing: 'Rowing',
  Run: 'Run',
  Snowboard: 'Snowboard',
  Snowshoe: 'Snowshoe',
  StairStepper: 'StairStepper',
  StandUpPaddling: 'StandUpPaddling',
  Surfing: 'Surfing',
  Swim: 'Swim',
  VirtualRide: 'VirtualRide',
  Walk: 'Walk',
  WeightTraining: 'WeightTraining',
  Windsurf: 'Windsurf',
  Workout: 'Workout',
  Yoga: 'Yoga',
} as const;

export const ActivityZoneDefs = {
  Heartrate: 'heartrate',
  Power: 'power',
} as const;

export const FollowerStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Blocked: 'blocked',
} as const;

export const ResourceState = {
  Meta: 1,
  Summary: 2,
  Detail: 3,
} as const;

export const Sex = {
  Female: 'F',
  Male: 'M',
} as const;

export const SportName = {
  Cycling: 'cycling',
  Running: 'running',
  Triathlon: 'triathlon',
  Other: 'other',
} as const;

export const StreamKeys = {
  Time: 'time',
  Distance: 'distance',
  LatLng: 'latlng',
  Altitude: 'altitude',
  VelocitySmooth: 'velocity_smooth',
  Heartrate: 'heartrate',
  Cadence: 'cadence',
  Watts: 'watts',
  Temp: 'temp',
  Moving: 'moving',
  GradeSmooth: 'grade_smooth',
} as const;

export const UnitSystem = {
  Feet: 'feet',
  Meters: 'meters',
} as const;
