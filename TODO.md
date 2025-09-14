# Pipeline Flow Fix - TODO

## Current Issue

After resume tailoring, the pipeline skips aptitude and coding rounds, going directly to interview simulation.

## Required Flow

uploaded → tailored → aptitude → coding → interview → analytics

## Tasks

- [x] Update Index.tsx to add 'aptitude' and 'coding' views
- [x] Modify ResumeTailoring.tsx to navigate to aptitude instead of creating interview
- [x] Create CodingRound.tsx component with navigation to interview
- [x] Ensure Aptitude.tsx navigates to coding round
- [x] Update pipeline stage updates throughout the flow
- [ ] Test complete pipeline flow
- [ ] Verify pipeline stages are updated correctly
- [ ] Ensure navigation buttons work as a linked list
