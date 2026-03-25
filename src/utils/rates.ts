// CPWD DSR 2024 Rate Reference Table
// These are actual CPWD Delhi Schedule of Rates (Base: Delhi)
// For other regions, location factor applies

export function getCPWDRateReference(currency: string = 'INR'): string {
  const exchangeNote = currency !== 'INR' 
    ? `\n\nNOTE: Convert all rates from INR base to ${currency} using current exchange rates. For AED multiply INR by ~0.044, for USD multiply INR by ~0.012, for SAR multiply by ~0.045, for GBP multiply by ~0.0095, for EUR multiply by ~0.011.\n` 
    : '';

  return `
═══════════════════════════════════════════════════════════════
MANDATORY RATE REFERENCE — CPWD DSR 2024 (Delhi Base Rates)
YOU MUST USE THESE EXACT RATES. DO NOT FABRICATE OR MODIFY.
USE THE EXACT RATE SHOWN — NO RANGES, NO ROUNDING.
═══════════════════════════════════════════════════════════════
${exchangeNote}

1. EARTHWORK & SITE PREPARATION
├─ Excavation in ordinary soil ≤1.5m depth: ₹398/m³ [DSR 2.1]
├─ Excavation in ordinary soil 1.5–3.0m depth: ₹487/m³ [DSR 2.2]
├─ Excavation in hard rock (blasting prohibited): ₹1,042/m³ [DSR 2.8]
├─ Backfilling with excavated earth (compacted): ₹108/m³ [DSR 2.19]
├─ Sand filling under foundation/floors: ₹1,580/m³ [DSR 2.22]
├─ Anti-termite treatment (pre-construction): ₹54/m² [DSR 2.38]
├─ Dewatering (per shift): ₹3,200/shift [DSR 2.40]
└─ Shoring and strutting: ₹462/m² [DSR 2.35]

2. CONCRETE WORKS (Including materials, mixing, placing, vibrating, curing)
├─ PCC M10 (1:3:6) — lean concrete / leveling: ₹5,410/m³ [DSR 4.1]
├─ PCC M15 (1:2:4) — foundation bed: ₹5,862/m³ [DSR 4.2]
├─ RCC M20 — general structural: ₹6,438/m³ [DSR 4.7]
├─ RCC M25 — slabs, beams: ₹7,126/m³ [DSR 4.8]
├─ RCC M30 — columns, special structural: ₹7,894/m³ [DSR 4.9]
├─ RCC M35 — high strength: ₹8,762/m³ [DSR 4.10]
├─ RCC M40 — prestressed/special: ₹9,684/m³ [DSR 4.11]
├─ Ready Mix premium (add to above): +₹980/m³
├─ Pumping charges (add if applicable): +₹540/m³
└─ Form work (steel shuttering): ₹438/m² [DSR 4.20]

3. REINFORCEMENT STEEL
├─ Fe500/Fe500D TMT bars (supply + cutting + bending + tying): ₹78.50/kg [DSR 5.1]
├─ Fe500D TMT bars (high ductility): ₹82.40/kg [DSR 5.2]
├─ Structural steel (fabrication + erection): ₹104/kg [DSR 5.10]
├─ Binding wire (included in above rates): ₹4.20/kg of steel
├─ Welded wire mesh: ₹92/kg [DSR 5.15]
└─ Steel fiber for concrete: ₹138/kg [DSR 5.20]

4. MASONRY WORKS
├─ Brick masonry (class A) CM 1:4 — structural: ₹6,942/m³ [DSR 6.1]
├─ Brick masonry (class A) CM 1:6 — general: ₹6,284/m³ [DSR 6.2]
├─ AAC blocks 200mm thick CM 1:4: ₹4,586/m³ [DSR 6.12]
├─ AAC blocks 150mm thick CM 1:4: ₹4,128/m³ [DSR 6.13]
├─ AAC blocks 100mm thick CM 1:4: ₹3,472/m³ [DSR 6.14]
├─ Fly ash brick masonry CM 1:4: ₹5,186/m³ [DSR 6.8]
├─ Concrete block masonry 200mm: ₹4,382/m³ [DSR 6.10]
├─ Random rubble masonry CM 1:6: ₹3,948/m³ [DSR 6.18]
└─ Stone masonry coursed rubble CM 1:6: ₹5,126/m³ [DSR 6.20]

5. PLASTERING & POINTING
├─ 12mm internal plaster CM 1:4: ₹228/m² [DSR 11.1]
├─ 12mm internal plaster CM 1:6: ₹204/m² [DSR 11.2]
├─ 15mm internal plaster CM 1:4: ₹258/m² [DSR 11.3]
├─ 20mm external plaster CM 1:4: ₹312/m² [DSR 11.5]
├─ 15mm external plaster CM 1:4: ₹268/m² [DSR 11.4]
├─ Neeru (lime) finish 3mm: ₹104/m² [DSR 11.8]
├─ Cement pointing flush: ₹98/m² [DSR 11.12]
└─ POP punning 6mm on walls: ₹132/m² [DSR 11.10]

6. FLOORING & TILING
├─ Vitrified tiles 600×600mm (double charged): ₹1,164/m² [DSR 14.32]
├─ Vitrified tiles 800×800mm: ₹1,342/m² [DSR 14.33]
├─ Ceramic floor tiles 300×300mm: ₹668/m² [DSR 14.28]
├─ Ceramic wall tiles 300×450mm (dado): ₹594/m² [DSR 14.30]
├─ Kota stone flooring 25mm: ₹786/m² [DSR 14.15]
├─ Granite flooring 18mm polished: ₹2,284/m² [DSR 14.20]
├─ Marble flooring 18mm polished: ₹2,836/m² [DSR 14.22]
├─ IPS flooring 25mm (cement concrete): ₹326/m² [DSR 14.5]
├─ Cement concrete flooring 1:2:4 — 40mm: ₹408/m² [DSR 14.8]
├─ Epoxy flooring: ₹568/m² [DSR 14.40]
├─ Skirting (vitrified 100mm): ₹308/Rmt [DSR 14.35]
└─ Staircase nosing (aluminum): ₹418/Rmt

7. WATERPROOFING
├─ APP membrane 4mm thick (with primer): ₹324/m² [DSR 15.5]
├─ SBS membrane 3mm thick: ₹368/m² [DSR 15.6]
├─ Integral waterproofing compound: ₹148/m² [DSR 15.1]
├─ Crystalline waterproofing: ₹226/m² [DSR 15.8]
├─ Toilet/wet area waterproofing (IPS + membrane): ₹312/m² [DSR 15.3]
├─ Expansion joint treatment: ₹542/Rmt [DSR 15.12]
└─ Terrace waterproofing (brick bat coba): ₹382/m² [DSR 15.2]

8. DOORS, WINDOWS & FIXTURES
├─ Flush door shutter 35mm (commercial): ₹8,640/each [DSR 17.1]
├─ Flush door shutter 35mm (decorative): ₹10,850/each [DSR 17.2]
├─ Sal/teak wood door frame (per Rmt): ₹1,486/Rmt [DSR 17.5]
├─ PVC door shutter: ₹4,180/each [DSR 17.8]
├─ Fire rated door (2 hour): ₹21,400/each [DSR 17.12]
├─ Aluminum sliding window (anodized): ₹1,786/m² [DSR 18.5]
├─ Aluminum fixed window (powder coated): ₹1,982/m² [DSR 18.6]
├─ UPVC window: ₹1,486/m² [DSR 18.8]
├─ MS window grill: ₹784/m² [DSR 18.15]
├─ SS hardware set (per door): ₹3,240/set [DSR 17.20]
├─ Door closer hydraulic: ₹2,380/each [DSR 17.22]
└─ Tower bolt + aldrop set: ₹468/set [DSR 17.25]

9. PAINTING & FINISHING
├─ Acrylic emulsion interior — 2 coats + primer: ₹78/m² [DSR 21.5]
├─ Acrylic emulsion interior — 3 coats + primer: ₹102/m² [DSR 21.6]
├─ Exterior weather coat — 2 coats + primer: ₹106/m² [DSR 21.8]
├─ Exterior texture paint: ₹148/m² [DSR 21.10]
├─ Oil bound distemper — 2 coats: ₹54/m² [DSR 21.2]
├─ Primer coat (single): ₹42/m² [DSR 21.1]
├─ Enamel paint on wood/metal — 2 coats: ₹92/m² [DSR 21.12]
├─ Cement paint — 2 coats: ₹42/m² [DSR 21.3]
├─ Anti-fungal treatment: ₹32/m² [DSR 21.15]
├─ Wall putty 2 coats: ₹66/m² [DSR 21.18]
└─ Wood polish (melamine): ₹116/m² [DSR 21.20]

10. FALSE CEILING
├─ Mineral fiber tiles 600×600 with T-grid: ₹412/m² [DSR 14.45]
├─ Gypsum board 12.5mm with frame: ₹496/m² [DSR 14.48]
├─ Gypsum board double layer (fire rated): ₹632/m² [DSR 14.49]
├─ POP false ceiling 12mm: ₹328/m² [DSR 14.42]
├─ Metal false ceiling: ₹768/m² [DSR 14.50]
└─ Grid ceiling (exposed): ₹558/m² [DSR 14.52]

11. ELECTRICAL WORKS
├─ PVC conduit wiring 1.5mm² (1+1): ₹132/Rmt [DSR 26.1]
├─ PVC conduit wiring 2.5mm² (1+1): ₹158/Rmt [DSR 26.2]
├─ PVC conduit wiring 4mm² (1+1): ₹206/Rmt [DSR 26.3]
├─ FRLS cable 2.5mm² in conduit: ₹182/Rmt [DSR 26.5]
├─ LED panel light 36W (600×600): ₹2,980/each [DSR 26.25]
├─ LED downlight 12W recessed: ₹1,024/each [DSR 26.22]
├─ LED tube light 20W with fitting: ₹542/each [DSR 26.20]
├─ Switch board 6 module (with switches): ₹1,018/each [DSR 26.30]
├─ Switch board 12 module: ₹1,486/each [DSR 26.32]
├─ Distribution board 8-way TPN: ₹4,230/each [DSR 26.35]
├─ Distribution board 12-way TPN: ₹6,180/each [DSR 26.36]
├─ Earthing (plate type): ₹5,480/each [DSR 26.40]
├─ Earthing (pipe type): ₹3,940/each [DSR 26.42]
├─ Main switch/MCCB 63A: ₹4,480/each [DSR 26.45]
└─ Ceiling fan with regulator: ₹3,480/each [DSR 26.50]

12. PLUMBING & SANITARY
├─ UPVC soil pipe 110mm with fittings: ₹326/Rmt [DSR 23.5]
├─ UPVC waste pipe 75mm with fittings: ₹264/Rmt [DSR 23.6]
├─ CPVC water supply 25mm: ₹218/Rmt [DSR 23.12]
├─ CPVC water supply 20mm: ₹186/Rmt [DSR 23.11]
├─ GI pipe 25mm (medium class): ₹368/Rmt [DSR 23.1]
├─ GI pipe 40mm (medium class): ₹512/Rmt [DSR 23.2]
├─ PVC water tank 1000L: ₹7,480/each [DSR 23.25]
├─ EWC (European WC) with cistern: ₹11,240/set [DSR 23.30]
├─ IWC (Indian WC) with cistern: ₹4,480/set [DSR 23.32]
├─ Wash basin with pedestal: ₹5,120/set [DSR 23.35]
├─ Urinal with flushing valve: ₹5,680/each [DSR 23.38]
├─ CP fittings (pillar cock): ₹1,680/each [DSR 23.40]
├─ CP fittings (mixer with shower): ₹4,720/set [DSR 23.42]
├─ Floor trap (nickel brass): ₹586/each [DSR 23.45]
├─ Manhole chamber (brick, 600×600): ₹7,680/each [DSR 23.50]
└─ Septic tank (per KL capacity): ₹13,840/KL [DSR 23.55]

13. HVAC (Market Rates — not in CPWD DSR, use prevailing market rates)
├─ Split AC 1.5 Ton (5-star inverter + installation): ₹51,200/each
├─ Split AC 2.0 Ton (5-star inverter + installation): ₹66,400/each
├─ VRF/VRV system: ₹2,280/m² of conditioned area
├─ Exhaust fan 12" with louver: ₹2,680/each
├─ Fresh air handling unit: ₹812/m² of served area
├─ Copper piping for AC (insulated): ₹418/Rmt
├─ Ductwork (GI): ₹1,024/m²
└─ Chilled water piping: ₹786/Rmt

14. FIRE FIGHTING (Market Rates)
├─ Fire extinguisher ABC 9kg: ₹3,720/each
├─ Fire hydrant system (per point): ₹18,400/point
├─ Sprinkler system: ₹224/m² of covered area
├─ Fire alarm system: ₹156/m² of covered area
├─ Smoke detector: ₹1,980/each
├─ Fire hose reel: ₹9,840/each
└─ Fire pump set (diesel + electric): ₹4,42,000/set

15. MISCELLANEOUS
├─ MS railing (pipe type): ₹1,018/Rmt
├─ SS railing (304 grade): ₹2,840/Rmt
├─ Glass railing (toughened 12mm): ₹4,480/Rmt
├─ Aluminum composite panel cladding: ₹2,280/m²
├─ Stone cladding (granite/marble): ₹3,480/m²
├─ RCC drain (open, 300×300): ₹1,018/Rmt
├─ Compound wall (brick, 1.5m): ₹4,240/Rmt
├─ Chain link fencing: ₹568/Rmt
├─ Site leveling and grading: ₹44/m²
├─ Road work (WBM + BT): ₹1,124/m²
├─ Paver block 80mm (herringbone): ₹918/m²
├─ Paver block 60mm (footpath): ₹694/m²
├─ Kerb stone (precast): ₹418/Rmt
└─ Lawn development (soil prep + grass): ₹122/m²

═══════════════════════════════════════════════════════════════
RULES FOR USING THIS RATE TABLE:
1. USE THE EXACT RATE SHOWN — do not modify, round, or create ranges
2. For items NOT in this table → use "Market Rate" label and provide
   a reasonable rate with justification
3. NEVER invent CPWD DSR item numbers — use the reference codes shown above
4. For UAE/Middle East projects: multiply INR rates × 3.8 for AED equivalent
5. Rates include labor + material unless noted otherwise
6. Add 1.5% for wastage depending on item
7. Contractor profit & overhead (12%) should be shown separately
═══════════════════════════════════════════════════════════════
`;
}

// ═══ RATE LOOKUP TABLE — for post-processing validation ═══
// Maps DSR reference codes to exact INR rates
export const CPWD_RATE_LOOKUP: Record<string, number> = {
  'DSR 2.1': 398, 'DSR 2.2': 487, 'DSR 2.8': 1042, 'DSR 2.19': 108,
  'DSR 2.22': 1580, 'DSR 2.38': 54, 'DSR 2.40': 3200, 'DSR 2.35': 462,
  'DSR 4.1': 5410, 'DSR 4.2': 5862, 'DSR 4.7': 6438, 'DSR 4.8': 7126,
  'DSR 4.9': 7894, 'DSR 4.10': 8762, 'DSR 4.11': 9684, 'DSR 4.20': 438,
  'DSR 5.1': 78.50, 'DSR 5.2': 82.40, 'DSR 5.10': 104, 'DSR 5.15': 92, 'DSR 5.20': 138,
  'DSR 6.1': 6942, 'DSR 6.2': 6284, 'DSR 6.12': 4586, 'DSR 6.13': 4128,
  'DSR 6.14': 3472, 'DSR 6.8': 5186, 'DSR 6.10': 4382, 'DSR 6.18': 3948, 'DSR 6.20': 5126,
  'DSR 11.1': 228, 'DSR 11.2': 204, 'DSR 11.3': 258, 'DSR 11.5': 312,
  'DSR 11.4': 268, 'DSR 11.8': 104, 'DSR 11.12': 98, 'DSR 11.10': 132,
  'DSR 14.32': 1164, 'DSR 14.33': 1342, 'DSR 14.28': 668, 'DSR 14.30': 594,
  'DSR 14.15': 786, 'DSR 14.20': 2284, 'DSR 14.22': 2836, 'DSR 14.5': 326,
  'DSR 14.8': 408, 'DSR 14.40': 568, 'DSR 14.35': 308,
  'DSR 15.5': 324, 'DSR 15.6': 368, 'DSR 15.1': 148, 'DSR 15.8': 226,
  'DSR 15.3': 312, 'DSR 15.12': 542, 'DSR 15.2': 382,
  'DSR 17.1': 8640, 'DSR 17.2': 10850, 'DSR 17.5': 1486, 'DSR 17.8': 4180,
  'DSR 17.12': 21400, 'DSR 18.5': 1786, 'DSR 18.6': 1982, 'DSR 18.8': 1486,
  'DSR 18.15': 784, 'DSR 17.20': 3240, 'DSR 17.22': 2380, 'DSR 17.25': 468,
  'DSR 21.5': 78, 'DSR 21.6': 102, 'DSR 21.8': 106, 'DSR 21.10': 148,
  'DSR 21.2': 54, 'DSR 21.1': 42, 'DSR 21.12': 92, 'DSR 21.3': 42,
  'DSR 21.15': 32, 'DSR 21.18': 66, 'DSR 21.20': 116,
  'DSR 14.45': 412, 'DSR 14.48': 496, 'DSR 14.49': 632, 'DSR 14.42': 328,
  'DSR 14.50': 768, 'DSR 14.52': 558,
  'DSR 26.1': 132, 'DSR 26.2': 158, 'DSR 26.3': 206, 'DSR 26.5': 182,
  'DSR 26.25': 2980, 'DSR 26.22': 1024, 'DSR 26.20': 542, 'DSR 26.30': 1018,
  'DSR 26.32': 1486, 'DSR 26.35': 4230, 'DSR 26.36': 6180,
  'DSR 26.40': 5480, 'DSR 26.42': 3940, 'DSR 26.45': 4480, 'DSR 26.50': 3480,
  'DSR 23.5': 326, 'DSR 23.6': 264, 'DSR 23.12': 218, 'DSR 23.11': 186,
  'DSR 23.1': 368, 'DSR 23.2': 512, 'DSR 23.25': 7480, 'DSR 23.30': 11240,
  'DSR 23.32': 4480, 'DSR 23.35': 5120, 'DSR 23.38': 5680, 'DSR 23.40': 1680,
  'DSR 23.42': 4720, 'DSR 23.45': 586, 'DSR 23.50': 7680, 'DSR 23.55': 13840,
};

/**
 * Validates and corrects rates from AI response.
 * Claude sometimes multiplies INR rates by ~83.5 (USD→INR exchange rate).
 * This function detects and corrects that inflation.
 */
export function validateAndCorrectRates(items: any[], rateField: string = 'unitRate', sourceField: string = 'rateSource'): any[] {
  return items.map(item => {
    const src = String(item[sourceField] || '');
    // Extract DSR reference code from rateSource string
    const dsrMatch = src.match(/DSR\s*(\d+\.\d+)/i);
    if (dsrMatch) {
      const dsrKey = `DSR ${dsrMatch[1]}`;
      const correctRate = CPWD_RATE_LOOKUP[dsrKey];
      if (correctRate !== undefined) {
        const aiRate = Number(item[rateField]) || 0;
        // If AI rate is significantly higher than correct rate (>5× off), replace it
        if (aiRate > correctRate * 5) {
          const corrected = { ...item };
          corrected[rateField] = correctRate;
          // Recalculate total if it exists
          const qty = Number(corrected.quantity || corrected.qty) || 0;
          if (corrected.total !== undefined) corrected.total = qty * correctRate;
          if (corrected.amount !== undefined) corrected.amount = qty * correctRate;
          return corrected;
        }
        // If AI rate is very close to correct rate (within 20%), keep it
        // Otherwise if it's 2-5× off, still replace with correct rate
        if (aiRate > correctRate * 2) {
          const corrected = { ...item };
          corrected[rateField] = correctRate;
          const qty = Number(corrected.quantity || corrected.qty) || 0;
          if (corrected.total !== undefined) corrected.total = qty * correctRate;
          if (corrected.amount !== undefined) corrected.amount = qty * correctRate;
          return corrected;
        }
      }
    }
    return item;
  });
}

// Regional multipliers for different Indian cities
export const REGIONAL_FACTORS: Record<string, number> = {
  'Delhi NCR': 1.00,
  'Mumbai': 1.15,
  'Bangalore': 1.05,
  'Chennai': 0.95,
  'Hyderabad': 0.95,
  'Kolkata': 0.90,
  'Pune': 1.05,
  'Ahmedabad': 0.92,
  'Jaipur': 0.88,
  'Lucknow': 0.85,
  'Tier 2 cities': 0.85,
  'Tier 3 cities': 0.78,
  'Dubai/UAE': 3.80,
  'Saudi Arabia': 3.60,
  'Qatar': 4.00,
  'Oman': 3.50,
};

// Middle East specific rates (AED)
export function getMiddleEastRates(): string {
  return `
═══════════════════════════════════════════════════════════════
MIDDLE EAST MARKET RATES (AED) — Dubai/Abu Dhabi Base 2024
═══════════════════════════════════════════════════════════════

1. EARTHWORK
├─ Excavation in normal soil: AED 35/m³
├─ Excavation in rock: AED 92/m³
├─ Backfilling (compacted): AED 18/m³
├─ Sand filling (compacted): AED 44/m³
├─ Dewatering: AED 840/day
└─ Shoring (sheet piles): AED 264/m²

2. CONCRETE
├─ Lean concrete / blinding: AED 396/m³
├─ Grade 30 concrete (C30): AED 498/m³
├─ Grade 40 concrete (C40): AED 582/m³
├─ Grade 50 concrete (C50): AED 672/m³
├─ Grade 60 concrete (C60): AED 792/m³
├─ Formwork (standard): AED 108/m²
└─ Post-tensioning: AED 32/kg

3. STEEL REINFORCEMENT
├─ Rebar Grade 460 (cut, bend, fix): AED 5.40/kg
├─ Structural steel (fabricated + erected): AED 14.80/kg
└─ Welded mesh: AED 6.60/kg

4. MASONRY
├─ Concrete block 200mm (standard): AED 188/m²
├─ Concrete block 150mm: AED 154/m²
├─ Concrete block 100mm (partition): AED 116/m²
├─ Insulated concrete block: AED 248/m²
└─ AAC block 200mm: AED 218/m²

5. PLASTERING
├─ Internal plaster 15mm: AED 32/m²
├─ External plaster 20mm: AED 44/m²
├─ Skim coat / putty: AED 16/m²
└─ Render (textured external): AED 56/m²

6. FLOORING
├─ Porcelain tiles 600×600: AED 116/m²
├─ Marble flooring (polished): AED 342/m²
├─ Granite flooring: AED 286/m²
├─ Ceramic tiles: AED 74/m²
├─ Epoxy flooring: AED 86/m²
├─ Raised access floor: AED 236/m²
└─ Carpet tiles: AED 92/m²

7. PAINTING
├─ Interior emulsion (2 coats + primer): AED 16/m²
├─ Exterior paint (weatherproof): AED 24/m²
├─ Epoxy paint: AED 32/m²
└─ Anti-carbonation coating: AED 38/m²

8. MEP (Mechanical, Electrical, Plumbing)
├─ Electrical (overall): AED 264/m² of built-up area
├─ Plumbing (overall): AED 182/m² of built-up area
├─ HVAC (overall): AED 372/m² of conditioned area
├─ Fire fighting (overall): AED 118/m² of built-up area
├─ Split AC 2 Ton: AED 5,680/each
├─ VRF system: AED 446/m²
└─ BMS system: AED 64/m²

═══════════════════════════════════════════════════════════════
`;
}
