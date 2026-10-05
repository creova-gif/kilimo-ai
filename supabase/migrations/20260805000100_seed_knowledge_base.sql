-- KILIMO AI — seed the RAG knowledge_base with baseline agronomy guidance.
--
-- Content is original, general agronomic guidance for East African smallholders.
-- Embeddings are left NULL: rag-chat's keyword fallback retrieves these rows via
-- ILIKE. To enable vector similarity, backfill `embedding` with a model whose
-- output dimension matches the column (vector(768)) — see docs.
--
-- NOTE: this seed is advisory, not a substitute for a local extension officer.

insert into public.knowledge_base (title, content, category, region)
values
  ('Maize — fall armyworm',
   'Scout maize weekly from emergence. Fall armyworm damage shows as ragged holes and windowing on young leaves, with moist frass in the funnel. Hand-pick egg masses early, apply wood ash or neem to the funnel, and only escalate to a recommended insecticide at high infestation. Rotate actives to avoid resistance and consult your extension officer for dosage.',
   'crop_disease', null),
  ('Maize — common rust',
   'Common rust appears as small reddish-brown powdery pustules on both leaf surfaces. Plant rust-tolerant varieties and space plants for airflow. At early onset apply a fungicide containing mancozeb or propiconazole; consult an agronomist for the correct rate and pre-harvest interval.',
   'crop_disease', null),
  ('Tomato — early blight',
   'Early blight causes dark concentric "target" spots on older leaves and can defoliate the plant. Remove infected leaves, avoid overhead watering, mulch to reduce soil splash, rotate away from tomato/potato for two seasons, and apply a protective fungicide at first symptoms.',
   'crop_disease', null),
  ('Fertiliser — maize basics',
   'For maize, apply a phosphorus-rich starter (e.g. DAP) at planting and top-dress nitrogen (e.g. urea/CAN) at knee height. Base rates on a soil test where possible; split nitrogen to reduce leaching. Never place fertiliser in direct contact with seed.',
   'fertiliser', null),
  ('Irrigation — dry spells',
   'During dry spells prioritise water at flowering and grain fill, the most yield-sensitive stages. Water early morning or late evening to cut evaporation, and mulch to conserve soil moisture. Drip or furrow irrigation uses far less water than broadcast.',
   'irrigation', null),
  ('Post-harvest — grain storage',
   'Dry grain to about 13 percent moisture before storage to prevent mould and aflatoxin. Store in clean, sealed hermetic bags or treated silos, off the ground and away from walls. Inspect monthly for pests and remove any mouldy grain immediately.',
   'post_harvest', null),
  ('Weather — heavy rain advisory',
   'Ahead of heavy rain, avoid applying fertiliser or pesticide that will wash off, ensure field drainage channels are clear, and delay harvesting mature grain until it can dry. Waterlogging longer than a day stresses maize roots.',
   'weather_pattern', null),
  ('Market — timing sales',
   'Prices are usually lowest right after harvest when supply peaks. Where safe storage allows, staggering sales over the season can improve average price. Compare several nearby markets and factor in transport cost before selling.',
   'market_info', null)
on conflict do nothing;
