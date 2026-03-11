# WME FC Layer

A [Tampermonkey](https://www.tampermonkey.net/) userscript for the [Waze Map Editor (WME)](https://www.waze.com/editor) that overlays **Functional Classification (FC)** data from state DOT ArcGIS services directly on the map, color-coded by road type.

**Install from Greasy Fork:** https://greasyfork.org/scripts/369633-wme-fc-layer

---

## Features

- Overlays FC data fetched live from state DOT ArcGIS REST services
- Color-coded road segments by functional class
- Sidebar panel with per-state data source info and controls
- State filter dropdown to focus on a single state
- "Hide Streets" toggle to reduce visual noise at lower zoom levels
- Layer visibility toggle integrated with WME's layer switcher
- Automatic update notifications via WME Utils Bootstrap
- Settings persist across sessions via `localStorage`
- Supports light and dark mode (uses WME CSS variables)

---

## Default Color Coding

| Color | Road Type | FC Values |
|---|---|---|
| ![#ff00c5](https://placehold.co/12x12/ff00c5/ff00c5.png) Magenta | Freeway (Fw) | FC 1 — Interstate |
| ![#4f33df](https://placehold.co/12x12/4f33df/4f33df.png) Purple | Expressway (Ew) | FC 2 — Other Freeways & Expressways |
| ![#149ece](https://placehold.co/12x12/149ece/149ece.png) Blue | Major Highway (MH) | FC 3 — Principal Arterial |
| ![#4ce600](https://placehold.co/12x12/4ce600/4ce600.png) Green | Minor Highway (mH) | FC 4 — Minor Arterial |
| ![#cfae0e](https://placehold.co/12x12/cfae0e/cfae0e.png) Yellow | Primary Street (PS) | FC 5–6 — Collector |
| ![#eeeeee](https://placehold.co/12x12/eeeeee/eeeeee.png) Gray | Street (St) | FC 7 — Local |

> Colors are defaults. Individual states may use different color schemes.

---

## Supported States

| State | Source | Permission |
|---|---|---|
| Alabama | ALDOT | R3+ |
| Alaska | Alaska DOT&PF | R4+ or R3-AM |
| Arizona | ADOT | R4+ or R3-AM |
| Arkansas | ARDOT | R4+ or R3-AM |
| California | Caltrans | Select users |
| Colorado | CDOT | R3+ |
| Connecticut | CTDOT | R3+ |
| Delaware | Delaware FirstMap | R4+ or R3-AM |
| Washington D.C. | DDOT | R4+ or R3-AM |
| Florida | FDOT | R4+ or R3-AM |
| Georgia | GDOT | R4+ or R3-AM |
| Hawaii | HDOT | R4+ or R3-AM |
| Idaho | ITD | R4+ or R3-AM |
| Illinois | IDOT | R4+ |
| Indiana | INDOT | All ranks |
| Iowa | Iowa DOT | R4+ or R3-AM |
| Kansas | KDOT | Area Managers |
| Kentucky | KYTC | All ranks |
| Louisiana | LaDOTD | R4+ or R3-AM |
| Maine | MaineDOT | R4+ or R3-AM |
| Maryland | MDOT | R4+ or R3-AM |
| Massachusetts | MassDOT | R2+ |
| Michigan | MDOT | All ranks |
| Minnesota | MnDOT | All ranks |
| Missouri | MoDOT | R3+ or R2-AM |
| Montana | MDT | Select users |
| Nevada | NDOT | Select users |
| New Hampshire | NH GRANIT | R2+ |
| New Mexico | NMDOT | All ranks |
| New York | NYSDOT | R4+ or R3-AM |
| North Carolina | NCDOT | R3+ |
| North Dakota | NDDOT | R4+ or R3-AM |
| Ohio | ODOT | All ranks / R4+ or R3-AM |
| Oregon | ODOT | R4+ or R3-AM |
| Pennsylvania | PennDOT | R4+ |
| Rhode Island | RIDOT | R2+ |
| South Carolina | SCDOT | R4+ |
| South Dakota | SDDOT | R4+ or R3-AM |
| Tennessee | Memphis/Nashville MPO | R4+ or R3-AM |
| Texas | TxDOT | R2+ |
| Utah | UDOT | R4+ or R3-AM |
| Vermont | VTrans | R2+ |
| Virginia | VDOT | R4+ or R3-AM |
| Washington | WSDOT | R4+ or R3-AM |
| West Virginia | WV DOT | R4+ or R3-AM |
| Wisconsin | WisDOT | R4+ or R3-AM |
| Wyoming | WYDOT | R4+ or R3-AM |

---

## Requirements

The following scripts must be installed and active (Tampermonkey loads them via `@require`):

- [WazeWrap](https://greasyfork.org/scripts/24851-wazewrap)
- [Turf.js](https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js)
- [WME Utils - Bootstrap](https://greasyfork.org/scripts/509664-wme-utils-bootstrap)

---

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click the install link on [Greasy Fork](https://greasyfork.org/scripts/369633-wme-fc-layer)
3. Open WME — the FC Layer panel will appear in the sidebar

---

## Usage

- The layer activates automatically when WME loads (minimum zoom level 11)
- Toggle visibility using the **FC Layer** checkbox in the WME layer switcher, or with the power button in the sidebar panel
- Use the **state dropdown** in the sidebar to filter to a single state
- Check **Hide Streets** to hide FC 7 (local road) segments and reduce clutter at lower zoom levels
- The sidebar panel displays the data source, permission level, and any notes for the currently selected state

---

## Contributing

Pull requests are welcome. When adding or updating a state:

1. Add an entry to `STATE_SETTINGS` in `WME-FC-Layer.js`
2. Add the state's ArcGIS `@connect` domain to the userscript header
3. Implement `getFeatureRoadType` and `getWhereClause` using existing states as a reference
4. Test at multiple zoom levels and verify color coding against the state DOT source

---

## Authors

- [MapOMatic](https://greasyfork.org/users/45389) — original author
- [JS55CT](https://greasyfork.org/users/JS55CT) — current maintainer

---

## License

[GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html)
