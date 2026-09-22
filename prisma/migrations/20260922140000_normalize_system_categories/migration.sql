-- Remap legacy system categories to the locked taxonomy.
-- Appliance → Culinary; Outdoor → Farm Equipment; anything else not in the set → Other.
UPDATE "System" SET "category" = 'Culinary' WHERE "category" = 'Appliance';
UPDATE "System" SET "category" = 'Farm Equipment' WHERE "category" = 'Outdoor';
UPDATE "System"
SET "category" = 'Other'
WHERE "category" NOT IN (
  'HVAC',
  'Culinary',
  'Laundry',
  'Water',
  'Electrical',
  'Plumbing',
  'Farm Equipment',
  'Vehicles',
  'Security',
  'Structures',
  'Other'
);
