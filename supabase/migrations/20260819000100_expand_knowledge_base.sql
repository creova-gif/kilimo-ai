-- KILIMO AI — expand the RAG knowledge_base beyond the original 8 rows.
--
-- Same rigor as 20260805000100_seed_knowledge_base.sql: original, general
-- agronomic guidance for East African smallholders, covering more of the
-- crops already real in app/crop-library.tsx's CROPS list plus the
-- planting-window / growth-stage / cover-crop / weed / climate-risk
-- categories the Phase 1 audit found had no coverage. Anything dose- or
-- rate-specific is deliberately left to a local extension officer, exactly
-- like the existing seed rows — this is advisory, not a substitute for one.
--
-- Embeddings are left NULL here too; rag-chat's reembed_missing action
-- backfills them post-deploy (run once after this migration).

insert into public.knowledge_base (title, content, category, region)
values
  ('Maize — planting window',
   'In most of Tanzania, maize is planted at the start of the Masika long rains (March-May) or the Vuli short rains (October-December), timed to the first reliable rains in your specific area rather than a fixed calendar date. Planting too early into unreliable rains risks a failed germination that must be replanted; planting late shortens the growing window before the dry season. Confirm local rainfall onset with your ward agricultural officer before committing seed.',
   'planting_calendar', null),
  ('Maize — growth stages at a glance',
   'Maize development is commonly tracked in vegetative (V) and reproductive (R) stages: VE emergence, V6 knee-high with the growing point differentiating, VT tasseling, R1 silking (the most water-sensitive stage), R4 dough, R6 physiological maturity (black layer). Knowing the current stage helps time nitrogen top-dress (around V6-V8), scouting intensity (peaks V6-VT), and irrigation priority (R1-R3).',
   'crop_disease', null),
  ('Rice — blast disease',
   'Rice blast shows as diamond-shaped grey-centred lesions with brown borders on leaves, and can girdle the neck below the panicle causing whole-panicle death. Favoured by high nitrogen, dense planting, and prolonged leaf wetness. Use resistant varieties where available, avoid excess nitrogen, maintain adequate but not excessive plant spacing for airflow, and consult an agronomist on a registered fungicide if blast is confirmed early.',
   'crop_disease', null),
  ('Rice — paddy water management',
   'Standing water of 5-10cm is generally maintained through tillering to panicle initiation to suppress weeds and stabilise temperature, drained briefly at mid-tillering to encourage root growth and reduce unproductive tillers, then reflooded through flowering, and drained again roughly two weeks before harvest to firm the soil. Adjust to your scheme''s actual water availability and consult local irrigation guidance.',
   'irrigation', null),
  ('Beans — anthracnose',
   'Bean anthracnose causes dark sunken lesions on pods, stems, and leaf veins, often with a pinkish spore mass in humid weather, and can be seed-borne. Use certified disease-free seed, rotate away from beans for at least two seasons, avoid working in wet fields (which spreads spores), and remove severely infected plant debris after harvest.',
   'crop_disease', null),
  ('Beans — bean fly (stem maggot)',
   'Bean fly larvae tunnel into the stem near the base of young seedlings, causing yellowing, stunting, and lodging, and are most damaging in the first three weeks after emergence. Early planting with the first reliable rains, seed dressing where available, and light earthing-up around the stem base to encourage adventitious roots all reduce losses; consult an agronomist before any insecticide seed treatment.',
   'crop_disease', null),
  ('Cassava — mosaic disease',
   'Cassava mosaic disease shows as pale green or yellow mottling and leaf distortion, spread by whitefly and by planting infected stem cuttings. Always source cuttings from healthy-looking, vigorous plants, rogue out and destroy visibly infected plants early, and where available plant mosaic-tolerant varieties recommended for your zone.',
   'crop_disease', null),
  ('Cassava — mealybug',
   'Cassava mealybug clusters as a white, waxy mass on shoot tips and leaf undersides, causing stunted, bunched "witch''s broom" growth. Natural enemies (parasitic wasps) usually keep it in check where broad-spectrum insecticides haven''t disrupted them — avoid unnecessary spraying, and report heavy infestations to your extension office, since biological control programmes exist for this pest in East Africa.',
   'crop_disease', null),
  ('Cotton — bollworm',
   'African bollworm larvae bore into cotton squares and bolls, causing shed squares and damaged, rotting bolls. Scout twice weekly during flowering and boll formation, checking for eggs on upper leaves and squares; hand-remove and destroy damaged bolls early in light infestations. Rotate any insecticide chemistry used and consult an agronomist on threshold-based spraying rather than a fixed calendar.',
   'crop_disease', null),
  ('Coffee — coffee berry disease',
   'Coffee berry disease causes sunken, dark, often sunken lesions on green berries that can rot the whole berry, worse in cool, wet, high-altitude conditions. Prune to open the canopy for airflow and light penetration, remove and destroy infected berries and prunings, and consult an agronomist on protective fungicide timing keyed to the onset of rains in your zone.',
   'crop_disease', null),
  ('Tomato — bacterial wilt',
   'Bacterial wilt causes sudden, irreversible wilting of the whole plant, often with no yellowing beforehand — cutting the stem near the base and suspending it in clear water shows a milky bacterial ooze if this is the cause. There is no cure once infected; rotate away from solanaceous crops (tomato, potato, pepper, eggplant) for at least three seasons, improve drainage, and remove infected plants and roots completely rather than composting them on-site.',
   'crop_disease', null),
  ('Onion — thrips',
   'Onion thrips cause silvery streaks and blotching on leaves, giving the crop a whitish, dried-out appearance from a distance, and worsen in hot, dry conditions. Avoid moisture stress (thrips build up faster on drought-stressed plants), consider a straw mulch to disrupt the pest''s lifecycle, and rotate away from onions and other alliums for at least a season if pressure is severe.',
   'crop_disease', null),
  ('Weed management — integrated approach',
   'The cheapest weed control is timing: the first 3-6 weeks after emergence is the critical period when weeds cost the most yield if left uncontrolled. Combine early hand-weeding or inter-row cultivation in that window, mulching to suppress regrowth, and crop rotation to break weed life cycles adapted to a single crop. If a herbicide is genuinely needed, get the product, rate, and timing confirmed by a local agronomist — misapplied herbicide can damage the crop as badly as the weeds.',
   'weed_management', null),
  ('Cover crops — between-season benefits',
   'A short-duration legume cover crop (e.g. lablab, mucuna, or cowpea grown as a cover rather than for grain) planted between main-season crops fixes nitrogen for the next crop, suppresses weeds by shading the soil, and reduces erosion on bare ground during the off-season. Terminate (slash or incorporate) before it sets hard seed, and leave 2-3 weeks before planting the next crop to let residue begin breaking down.',
   'cover_crop', null),
  ('Climate — recognising drought stress early',
   'Early drought stress in maize shows as leaf rolling during the hottest part of the day that doesn''t recover by evening, a dulling blue-green leaf colour, and delayed silking relative to tasseling. Where recurrent dry spells are a known risk in your zone, drought-tolerant varieties, wider plant spacing to reduce competition for limited water, and mulching to conserve soil moisture all reduce (but do not eliminate) yield loss — ask your extension officer which drought-tolerant varieties are certified for your zone this season.',
   'weather_pattern', null),
  ('Post-harvest — aflatoxin risk in maize and groundnuts',
   'Aflatoxin risk rises sharply when grain is stressed by drought before harvest, then dried slowly or stored above about 13-14% moisture. Harvest promptly at maturity, dry on a raised surface (not bare ground) to below 13% moisture before storage, sort out and discard visibly mouldy or insect-damaged kernels before bagging, and never mix a suspect batch into clean stored grain.',
   'post_harvest', null),
  ('Livestock — routine vaccination and deworming importance',
   'A consistent vaccination and deworming schedule (matched to the specific diseases and parasite burden common in your district) is one of the highest-return investments in smallholder livestock — treated animals gain weight faster and produce more milk than untreated ones carrying a hidden parasite or disease burden. Exact vaccines, dewormers, and timing vary by species, age, and local disease prevalence — get your schedule from a livestock officer or veterinary extension service rather than a generic calendar.',
   'crop_disease', null),
  ('Market — reading price signals across markets',
   'Comparing the same crop''s price across two or three nearby markets, not just the closest one, often reveals a gap larger than the transport cost to reach the better market — worth checking before committing a harvest to the first buyer. Prices for a given crop tend to move together across a region on trend but can diverge sharply around local supply gluts right after a harvest window, which is often the best short-term selling opportunity if storage isn''t available.',
   'market_info', null)
on conflict do nothing;
