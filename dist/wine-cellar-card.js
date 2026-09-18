/**
 * Wine Cellar Card for Home Assistant
 * ====================================
 * Dual-zone Lovelace card for a Haier hOn wine cellar.
 *
 * License: MIT
 *
 */

const CARD_VERSION = "1.0.12";

class WineCellarCard extends HTMLElement {
    static STRINGS = {
        en: {
            name: "Wine cellar",
            badge_on: "ON",
            badge_off: "OFF",
            badge_nodata: "NO DATA",
            target: "Target",
            env_temp: "Room temperature",
            mode: "Mode",
            program: "Program",
            power: "Power",
            light_on: "Light on",
            light_off: "Light off",
            error_title: "ERROR",
            tip_light: "Cellar light",
            zone1_label: "ZONE 1",
            zone2_label: "ZONE 2",
        },
        fr: {
            name: "Cave à vin",
            badge_on: "ALLUMÉE",
            badge_off: "ÉTEINTE",
            badge_nodata: "PAS DE DONNÉES",
            target: "Consigne",
            env_temp: "Température ambiante",
            mode: "Mode",
            program: "Programme",
            power: "Puissance",
            light_on: "Lumière allumée",
            light_off: "Lumière éteinte",
            error_title: "ERREUR",
            tip_light: "Éclairage cave",
            zone1_label: "ZONE 1",
            zone2_label: "ZONE 2",
        },
        es: {
            name: "Bodega de vinos",
            badge_on: "ENCENDIDA",
            badge_off: "APAGADA",
            badge_nodata: "SIN DATOS",
            target: "Consigna",
            env_temp: "Temperatura ambiente",
            mode: "Modo",
            program: "Programa",
            power: "Potencia",
            light_on: "Luz encendida",
            light_off: "Luz apagada",
            error_title: "ERROR",
            tip_light: "Luz de la bodega",
            zone1_label: "ZONA 1",
            zone2_label: "ZONA 2",
        },
        it: {
            name: "Cantina vini",
            badge_on: "ACCESA",
            badge_off: "SPENTA",
            badge_nodata: "NESSUN DATO",
            target: "Obiettivo",
            env_temp: "Temperatura ambiente",
            mode: "Modalità",
            program: "Programma",
            power: "Potenza",
            light_on: "Luce accesa",
            light_off: "Luce spenta",
            error_title: "ERRORE",
            tip_light: "Luce cantina",
            zone1_label: "ZONA 1",
            zone2_label: "ZONA 2",
        },
        pt: {
            name: "Adega de vinhos",
            badge_on: "LIGADA",
            badge_off: "DESLIGADA",
            badge_nodata: "SEM DADOS",
            target: "Alvo",
            env_temp: "Temperatura ambiente",
            mode: "Modo",
            program: "Programa",
            power: "Potência",
            light_on: "Luz ligada",
            light_off: "Luz desligada",
            error_title: "ERRO",
            tip_light: "Luz da adega",
            zone1_label: "ZONA 1",
            zone2_label: "ZONA 2",
        },
        de: {
            name: "Weinkühlschrank",
            badge_on: "AN",
            badge_off: "AUS",
            badge_nodata: "KEINE DATEN",
            target: "Sollwert",
            env_temp: "Raumtemperatur",
            mode: "Modus",
            program: "Programm",
            power: "Leistung",
            light_on: "Licht an",
            light_off: "Licht aus",
            error_title: "FEHLER",
            tip_light: "Kellerbeleuchtung",
            zone1_label: "ZONE 1",
            zone2_label: "ZONE 2",
        },
        nl: {
            name: "Wijnkelder",
            badge_on: "AAN",
            badge_off: "UIT",
            badge_nodata: "GEEN DATA",
            target: "Doel",
            env_temp: "Omgevingstemperatuur",
            mode: "Modus",
            program: "Programma",
            power: "Vermogen",
            light_on: "Licht aan",
            light_off: "Licht uit",
            error_title: "FOUT",
            tip_light: "Kelderverlichting",
            zone1_label: "ZONE 1",
            zone2_label: "ZONE 2",
        },
    };

    static NO_PROGRAM_STATES = ["none", "unknown", "unavailable", ""];

    static RING_RADIUS = 39;
    static RING_CIRCUMFERENCE = 2 * Math.PI * WineCellarCard.RING_RADIUS;

    static DEFAULTS = {
        zone1_min: 0,
        zone1_max: 20,
        zone2_min: 0,
        zone2_max: 20,
        cellar_visual_position: "left",
        hide_cellar_visual: false,
        no_error_states: [
            "00", "0", "none", "no error", "aucune erreur",
            "unknown", "unavailable", ""
        ],
    };

    static STUB_MODE_NAMES = {
        "0": "-",
        "1": "Standard",
        "2": "Eco",
    };

    static VISUAL_ORDER = {
        left: {
            visual: 0,
            zone1: 1,
            zone2: 2
        },
        center: {
            visual: 1,
            zone1: 0,
            zone2: 2
        },
        right: {
            visual: 2,
            zone1: 0,
            zone2: 1
        },
    };

    static getConfigElement() {
        return document.createElement("wine-cellar-card-editor");
    }

    static getStubConfig() {
        return {
            status_entity: "binary_sensor.wine_cellar_status",
        };
    }

    static languageDisplayName(code) {
        try {
            const displayNames = new Intl.DisplayNames([code], {
                type: "language"
            });
            const name = displayNames.of(code);
            return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
        } catch (error) {
            return code;
        }
    }

    setConfig(config) {
        if (!config.status_entity) {
            throw new Error("wine-cellar-card: status_entity is required");
        }

        this._config = {
            ...WineCellarCard.DEFAULTS,
            ...config,
            mode_names: config.mode_names === undefined
             ? {
                ...WineCellarCard.STUB_MODE_NAMES
            }
             : (config.mode_names && typeof config.mode_names === "object" ? config.mode_names : {}),
        };

        this._built = false;

        if (this._hass) {
            this._build();
            this._update();
        }
    }

    set hass(hass) {
        this._hass = hass;
        if (!this._built)
            this._build();
        this._update();
    }

    getCardSize() {
        return 4;
    }

    get _t() {
        const strings = WineCellarCard.STRINGS;

        const configured = String(this._config?.language || "").toLowerCase();
        if (configured && strings[configured])
            return strings[configured];

        const profileLanguage = (
            this._hass?.locale?.language || this._hass?.language || "").toLowerCase();

        if (profileLanguage) {
            if (strings[profileLanguage])
                return strings[profileLanguage];
            const base = profileLanguage.split(/[-_]/)[0];
            if (strings[base])
                return strings[base];
        }

        return strings.en;
    }

    _st(entityId) {
        return entityId ? this._hass?.states?.[entityId] : undefined;
    }

    _num(entityId) {
        const state = this._st(entityId);
        if (!state)
            return null;
        const value = Number.parseFloat(state.state);
        return Number.isFinite(value) ? value : null;
    }

    static NUMBER_SEPARATORS = {
        comma_decimal: { group: ",", decimal: "." },
        decimal_comma: { group: ".", decimal: "," },
        space_comma: { group: " ", decimal: "," },
    };

    _fmtNum(value, digits = 1) {
        const number = Number.parseFloat(value);
        if (!Number.isFinite(number))
            return null;

        const numberFormat = this._hass?.locale?.number_format;

        // "None": raw number, no thousands separator, dot as decimal point.
        if (numberFormat === "none")
            return number.toFixed(digits);

        // "System": defer entirely to the browser/OS locale.
        if (numberFormat === "system") {
            return new Intl.NumberFormat(undefined, {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
            }).format(number);
        }

        // comma_decimal / decimal_comma / space_comma: build the string from the separators the option name itself describes.
        const separators = WineCellarCard.NUMBER_SEPARATORS[numberFormat];
        if (separators) {
            const isNegative = number < 0;
            const [intPart, decPart] = Math.abs(number).toFixed(digits).split(".");
            const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separators.group);
            return `${isNegative ? "-" : ""}${grouped}${decPart ? separators.decimal + decPart : ""}`;
        }

        // Default ("language", or unset): follow the interface's own language, untouched.
        return new Intl.NumberFormat(this._hass?.locale?.language, {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }).format(number);
    }

    _moreInfo(entityId) {
        if (!entityId)
            return;

        this.dispatchEvent(new CustomEvent("hass-more-info", {
                detail: {
                    entityId
                },
                bubbles: true,
                composed: true,
            }));
    }

    _isLightOn(state) {
        return ["on", "true"].includes(String(state ?? "").toLowerCase());
    }

    _onLightClick() {
        const entityId = this._config.light_entity;
        if (!entityId)
            return;

        const domain = entityId.split(".")[0];
        if (["light", "switch"].includes(domain)) {
            this._hass.callService(domain, "toggle", {
                entity_id: entityId
            });
        } else {
            this._moreInfo(entityId);
        }
    }

    _ringDasharray(fraction) {
        const circumference = WineCellarCard.RING_CIRCUMFERENCE;
        const safeFraction = Math.max(0, Math.min(1, fraction));
        return `${(safeFraction * circumference).toFixed(1)} ${circumference.toFixed(1)}`;
    }

    _zoneConfigured(zone) {
        const config = this._config;
        return Boolean(
            config[`zone${zone}_temp_entity`] ||
            config[`zone${zone}_target_entity`] ||
            config[`zone${zone}_humidity_entity`]);
    }

    _displayTemp(zone, isOn) {
        const tempEntity = this._config[`zone${zone}_temp_entity`];
        const temp = tempEntity ? this._num(tempEntity) : null;
        return isOn && temp !== null ? `${this._fmtNum(temp, 1)}°` : "N/A";
    }

    _dualZoneBottlesMarkup() {
        return `
      <g>
        <circle cx="18" cy="40" r="4" fill="#7a1f2b"/>
        <circle cx="30" cy="40" r="4" fill="#e9e3d3"/>
        <circle cx="42" cy="40" r="4" fill="#33264a"/>
        <circle cx="54" cy="40" r="4" fill="#b8862c"/>
        <circle cx="66" cy="40" r="4" fill="#8a2035"/>
        <circle cx="78" cy="40" r="4" fill="#4a1e2e"/>
        <circle cx="18" cy="58" r="4" fill="#4a1e2e"/>
        <circle cx="30" cy="58" r="4" fill="#8a2035"/>
        <circle cx="42" cy="58" r="4" fill="#b8862c"/>
        <circle cx="54" cy="58" r="4" fill="#33264a"/>
        <circle cx="66" cy="58" r="4" fill="#e9e3d3"/>
        <circle cx="78" cy="58" r="4" fill="#7a1f2b"/>
        <circle cx="20" cy="100" r="5" fill="#8a2035"/>
        <circle cx="35" cy="100" r="5" fill="#33264a"/>
        <circle cx="50" cy="100" r="5" fill="#e9e3d3"/>
        <circle cx="65" cy="100" r="5" fill="#b8862c"/>
        <circle cx="78" cy="100" r="5" fill="#7a1f2b"/>
        <circle cx="20" cy="122" r="5" fill="#33264a"/>
        <circle cx="35" cy="122" r="5" fill="#7a1f2b"/>
        <circle cx="50" cy="122" r="5" fill="#b8862c"/>
        <circle cx="65" cy="122" r="5" fill="#e9e3d3"/>
        <circle cx="78" cy="122" r="5" fill="#4a1e2e"/>
      </g>
      <rect x="10" y="76" width="76" height="5" fill="#050506"/>
      <text x="48" y="80" text-anchor="middle" font-size="3" font-family="sans-serif" letter-spacing="1.5" fill="#5a5a5e">DUAL SPACE</text>
    `;
    }

    _singleZoneBottlesMarkup() {
        const columns = [18, 30, 42, 54, 66, 78];
        const rows = [38, 60, 82, 104, 126];
        const palette = ["#7a1f2b", "#e9e3d3", "#33264a", "#b8862c", "#8a2035", "#4a1e2e"];
        const radius = 4.3;

        const circles = rows.map((y, rowIndex) => {
            const colors = rowIndex % 2 === 0 ? palette : [...palette].slice().reverse();
            return columns.map((x, colIndex) =>
`<circle cx="${x}" cy="${y}" r="${radius}" fill="${colors[colIndex]}"/>`).join("");
        }).join("");

        return `<g>${circles}</g>`;
    }

    _cellarDisplayMarkup(dualZoneVisual) {
        if (dualZoneVisual) {
            return `
        <rect x="24" y="8" width="48" height="6.4" rx="2" fill="#000" stroke="#2a2a2a" stroke-width=".5"/>
        <text id="cvDisplayText" x="48" y="12.9" text-anchor="middle" font-size="3.6" font-family="monospace" fill="#6fd0e0">—° / —°</text>
      `;
        }
        return `
      <rect x="36" y="8" width="24" height="6.4" rx="2" fill="#000" stroke="#2a2a2a" stroke-width=".5"/>
      <text id="cvDisplayText" x="48" y="12.9" text-anchor="middle" font-size="4.4" font-family="monospace" fill="#6fd0e0">—°</text>
    `;
    }

    _build() {
        const config = this._config;
        const text = this._t;
        const root = this.shadowRoot || this.attachShadow({
            mode: "open"
        });

        const dualZoneVisual = this._zoneConfigured(1) && this._zoneConfigured(2);
        this._dualZoneVisual = dualZoneVisual;

        root.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          display: block;
          overflow: hidden;
          position: relative;
          padding: 16px 16px 14px;
          color: var(--primary-text-color);
          background: var(--ha-card-background, var(--card-background-color));
          border: 1px solid var(--ha-card-border-color, var(--divider-color));
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, none);
          font-family: var(--paper-font-body1_-_font-family, inherit);
        }
        .header { display: flex; align-items: center; gap: 10px; }
        .h-icon {
          display: flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; flex-shrink: 0;
          border: 1px solid var(--divider-color);
          border-radius: 14px;
          background: #f4f6f8;
          box-shadow: 0 2px 6px rgba(0,0,0,.15);
        }
        .h-icon ha-icon { --mdc-icon-size: 24px; color: #7a2038; }
        .wrap.dark-mode .h-icon {
          background: var(--secondary-background-color);
          box-shadow: 0 2px 8px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.06);
        }
        .h-title {
          flex: 0 1 auto; min-width: 56px;
          overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
          color: var(--primary-text-color);
          font-size: 17.5px; font-weight: 700;
        }
        .badge {
          display: flex; align-items: center; gap: 7px; flex-shrink: 0;
          padding: 6px 11px; border-radius: 999px;
          color: var(--secondary-text-color);
          background: var(--ha-card-background, var(--card-background-color));
          font-size: 11px; font-weight: 700; letter-spacing: .7px;
          white-space: nowrap;
        }
        .badge .b-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--disabled-text-color); }
        .nodata .badge { background: rgba(128,128,128,.12); color: var(--secondary-text-color); }
        .off .badge { background: rgba(var(--rgb-error-color,244,67,54),.14); color: var(--error-color,#f44336); }
        .off .badge .b-dot { background: var(--error-color,#f44336); }
        .on .badge { background: rgba(var(--rgb-success-color,76,175,80),.16); color: var(--success-color,#4caf50); }
        .on .badge .b-dot { background: var(--success-color,#4caf50); }
        .h-spacer { flex: 1; }
        .h-btn {
          display: flex; align-items: center; justify-content: center;
          width: 35px; height: 35px; flex-shrink: 0;
          border: 1px solid var(--divider-color); border-radius: 12px;
          color: var(--secondary-text-color);
          background: #f4f6f8;
          cursor: pointer; transition: transform .12s ease;
        }
        .wrap.dark-mode .h-btn {
          background: var(--secondary-background-color);
          box-shadow: 0 2px 8px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.06);
        }
        .h-btn:active { transform: scale(.94); }
        .h-btn ha-icon { --mdc-icon-size: 19px; }
        .h-btn.on {
          color: var(--primary-color); border-color: var(--primary-color);
          background: rgba(var(--rgb-primary-color,3,169,244),.12);
        }
        .wrap.dark-mode .h-btn.on {
          background: rgba(var(--rgb-primary-color,3,169,244),.12);
        }
        .error-banner {
          display: flex; align-items: center; gap: 8px;
          margin-top: 12px; padding: 10px 14px; border-radius: 14px;
          color: var(--error-color,#db4437);
          background: rgba(var(--rgb-error-color,219,68,55),.12);
          font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .error-banner ha-icon { --mdc-icon-size: 18px; }
        .content-row { display: flex; gap: 12px; margin-top: 14px; align-items: center; }
        .cellar-visual {
          display: flex; align-items: center; width: 83px; flex-shrink: 0;
          transition: opacity .4s ease, filter .4s ease;
        }
        .cellar-visual svg { width: 100%; height: auto; display: block; filter: drop-shadow(0 4px 8px rgba(0,0,0,.25)); }
        .off .cellar-visual { opacity: .45; filter: grayscale(.4); }
        .cv-glow { transition: opacity .5s ease; }
        .zone-panel {
          flex: 1 1 0; min-width: 0; padding: 10px 8px;
          text-align: center; border: 1px solid var(--divider-color);
          border-radius: 12px;
          background: #f6f8fa;
        }
        .wrap.dark-mode .zone-panel {
          background: var(--secondary-background-color);
        }
        .zone-label {
          margin-bottom: 6px; color: var(--secondary-text-color);
          font-size: 9.5px; font-weight: 800; letter-spacing: 1.1px;
        }
        .ring-box { position: relative; width: 68px; height: 68px; margin: 0 auto; cursor: pointer; }
        .ring-box svg { width: 100%; height: 100%; }
        .ring-track { stroke: var(--divider-color); }
        .ring-arc { stroke: #b0335a; stroke-linecap: round; transition: stroke-dasharray .5s ease; }
        .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .ring-temp { color: var(--primary-text-color); font-size: 14.5px; font-weight: 800; line-height: 1; }
        .ring-unit { color: var(--secondary-text-color); font-size: 8.5px; font-weight: 700; }
        .zone-target { margin-top: 6px; color: var(--secondary-text-color); font-size: 9.5px; cursor: pointer; }
        .zone-target b { color: var(--primary-text-color); }
        .zone-humidity {
          display: flex; align-items: center; justify-content: center; gap: 3px;
          margin-top: 4px; color: var(--info-color,#039be5);
          font-size: 10px; font-weight: 700; cursor: pointer;
        }
        .zone-humidity ha-icon { --mdc-icon-size: 12px; }
        .panel {
          display: grid; grid-template-columns: repeat(auto-fit,minmax(0,1fr));
          margin-top: 12px; padding: 12px 16px;
          border: 1px solid var(--divider-color); border-radius: 12px;
          background: #f6f8fa;
        }
        .wrap.dark-mode .panel {
          background: var(--secondary-background-color);
        }
        .info-item { min-width: 0; padding: 0 10px; border-left: 1px solid var(--divider-color); cursor: pointer; }
        .info-item:first-child { border-left: 0; padding-left: 0; }
        .info-label { color: var(--secondary-text-color); font-size: 10px; font-weight: 700; letter-spacing: .8px; }
        .info-value { margin-top: 4px; color: var(--primary-text-color); font-size: 13.5px; font-weight: 800; overflow-wrap: break-word; }
        .content-row:has(> .cellar-visual.hidden) .ring-box { width: 84px; height: 84px; }
        .content-row:has(> .cellar-visual.hidden) .ring-temp { font-size: 17px; }
        .hidden { display: none !important; }
      </style>

      <ha-card>
        <div class="wrap off" id="wrap">
          <div class="header">
            <div class="h-icon"><ha-icon icon="mdi:glass-wine"></ha-icon></div>
            <div class="h-title" id="name"></div>
            <div class="badge"><span class="b-dot"></span><span id="badgeText"></span></div>
            <div class="h-spacer"></div>
            <div class="h-btn hidden" id="lightBtn" title="${text.tip_light}">
              <ha-icon icon="mdi:lightbulb-off-outline" id="lightIcon"></ha-icon>
            </div>
          </div>

          <div class="error-banner hidden" id="errorBanner">
            <ha-icon icon="mdi:alert-circle"></ha-icon><span id="errorText"></span>
          </div>

          <div class="content-row">
            <div class="cellar-visual" id="cellarVisual">
              <svg viewBox="0 0 96 180" xmlns="http://www.w3.org/2000/svg" aria-label="Wine cellar illustration">
                <defs>
                  <linearGradient id="cvBody" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#2b2b2e"/><stop offset=".5" stop-color="#161618"/><stop offset="1" stop-color="#08080a"/>
                  </linearGradient>
                  <linearGradient id="cvGlass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#20262f"/><stop offset="1" stop-color="#0b0e13"/>
                  </linearGradient>
                </defs>
                <rect x="4" y="4" width="88" height="172" rx="10" fill="url(#cvBody)" stroke="#000"/>
                <rect x="4" y="4" width="88" height="15" rx="10" fill="#0b0b0d"/>
                <rect x="4" y="11" width="88" height="8" fill="#0b0b0d"/>
                ${this._cellarDisplayMarkup(dualZoneVisual)}
                <rect x="10" y="23" width="76" height="145" rx="6" fill="url(#cvGlass)" stroke="#000"/>
                <rect class="cv-glow" id="cvGlow" x="10" y="23" width="76" height="145" rx="6" fill="#ffcf7a" opacity=".08"/>
                ${dualZoneVisual ? this._dualZoneBottlesMarkup() : this._singleZoneBottlesMarkup()}
                <rect x="14" y="140" width="34" height="7" rx="3.5" fill="#141416"/>
                <circle cx="17" cy="143.5" r="1.6" fill="#c9a227"/>
                <rect x="34" y="152" width="40" height="7.5" rx="3.75" fill="#1c1c1f"/>
                <circle cx="38" cy="155.75" r="1.7" fill="#c9a227"/>
                <rect x="15" y="174" width="9" height="4" rx="1.5" fill="#1a1a1c"/>
                <rect x="72" y="174" width="9" height="4" rx="1.5" fill="#1a1a1c"/>
              </svg>
            </div>
            ${this._zoneMarkup(1)}
            ${this._zoneMarkup(2)}
          </div>

          <div class="panel hidden" id="infoPanel">
            <div class="info-item hidden" id="envItem"><div class="info-label">${text.env_temp}</div><div class="info-value" id="envValue">—</div></div>
            <div class="info-item hidden" id="modeItem"><div class="info-label">${text.mode}</div><div class="info-value" id="modeValue">—</div></div>
            <div class="info-item hidden" id="programItem"><div class="info-label">${text.program}</div><div class="info-value" id="programValue">—</div></div>
            <div class="info-item hidden" id="powerItem"><div class="info-label">${text.power}</div><div class="info-value" id="powerValue">—</div></div>
          </div>
        </div>
      </ha-card>
    `;

        this._el = (id) => root.getElementById(id);
        const moreInfo = (entityId) => () => this._moreInfo(entityId);

        this._el("errorBanner").addEventListener("click", moreInfo(config.error_entity));
        this._el("lightBtn").addEventListener("click", () => this._onLightClick());
        this._el("envItem").addEventListener("click", moreInfo(config.env_temp_entity));
        this._el("modeItem").addEventListener("click", moreInfo(config.mode_entity));
        this._el("programItem").addEventListener("click", moreInfo(config.program_name_entity));
        this._el("powerItem").addEventListener("click", moreInfo(config.power_entity));

        for (const zone of[1, 2]) {
            this._el(`zone${zone}Ring`).addEventListener("click", moreInfo(config[`zone${zone}_temp_entity`]));
            this._el(`zone${zone}Target`).addEventListener("click", moreInfo(config[`zone${zone}_target_entity`]));
            this._el(`zone${zone}HumidityRow`).addEventListener("click", moreInfo(config[`zone${zone}_humidity_entity`]));
            // Fall back to the current language's zone label when the field is left empty.
            this._el(`zone${zone}Label`).textContent = config[`zone${zone}_label`] || text[`zone${zone}_label`];
        }

        const order = WineCellarCard.VISUAL_ORDER[config.cellar_visual_position] || WineCellarCard.VISUAL_ORDER.left;
        this._el("cellarVisual").style.order = order.visual;
        this._el("zone1Panel").style.order = order.zone1;
        this._el("zone2Panel").style.order = order.zone2;
        this._el("cellarVisual").classList.toggle("hidden", Boolean(config.hide_cellar_visual));

        this._nodes = {
            wrap: this._el("wrap"),
            name: this._el("name"),
            badgeText: this._el("badgeText"),
            errorBanner: this._el("errorBanner"),
            errorText: this._el("errorText"),
            lightBtn: this._el("lightBtn"),
            lightIcon: this._el("lightIcon"),
            cvGlow: this._el("cvGlow"),
            cvDisplayText: this._el("cvDisplayText"),
            envItem: this._el("envItem"),
            envValue: this._el("envValue"),
            modeItem: this._el("modeItem"),
            modeValue: this._el("modeValue"),
            programItem: this._el("programItem"),
            powerItem: this._el("powerItem"),
            powerValue: this._el("powerValue"),
            programValue: this._el("programValue"),
            infoPanel: this._el("infoPanel"),
        };

        for (const zone of[1, 2]) {
            this._nodes[`zone${zone}Panel`] = this._el(`zone${zone}Panel`);
            this._nodes[`zone${zone}Temp`] = this._el(`zone${zone}Temp`);
            this._nodes[`zone${zone}Arc`] = this._el(`zone${zone}Arc`);
            this._nodes[`zone${zone}Target`] = this._el(`zone${zone}Target`);
            this._nodes[`zone${zone}HumidityRow`] = this._el(`zone${zone}HumidityRow`);
            this._nodes[`zone${zone}Humidity`] = this._el(`zone${zone}Humidity`);
        }

        this._built = true;
    }

    _zoneMarkup(zone) {
        return `
      <div class="zone-panel hidden" id="zone${zone}Panel">
        <div class="zone-label" id="zone${zone}Label"></div>
        <div class="ring-box" id="zone${zone}Ring">
          <svg viewBox="0 0 92 92">
            <circle class="ring-track" cx="46" cy="46" r="39" fill="none" stroke-width="7"/>
            <circle class="ring-arc" id="zone${zone}Arc" cx="46" cy="46" r="39" fill="none" stroke-width="7" stroke-dasharray="0 245" transform="rotate(-90 46 46)"/>
          </svg>
          <div class="ring-center"><div class="ring-temp" id="zone${zone}Temp">—</div><div class="ring-unit">°C</div></div>
        </div>
        <div class="zone-target" id="zone${zone}Target"></div>
        <div class="zone-humidity hidden" id="zone${zone}HumidityRow"><ha-icon icon="mdi:water-percent"></ha-icon><span id="zone${zone}Humidity"></span></div>
      </div>
    `;
    }

    _updateInfoItem(itemKey, valueKey, hasEntity, hasValue, displayValue) {
        if (!hasEntity) {
            this._nodes[itemKey].classList.add("hidden");
            return false;
        }
        this._nodes[itemKey].classList.remove("hidden");
        this._nodes[valueKey].textContent = hasValue ? displayValue : "N/A";
        return true;
    }

    _update() {
        const config = this._config;
        const text = this._t;
        const nodes = this._nodes;
        const status = this._st(config.status_entity);
        const noData = !status || ["unknown", "unavailable"].includes(status.state);
        const isOn = !noData && String(status.state).toLowerCase() === "on";

        nodes.wrap.classList.toggle("dark-mode", Boolean(this._hass?.themes?.darkMode));
        nodes.wrap.classList.toggle("on", isOn);
        nodes.wrap.classList.toggle("off", !isOn && !noData);
        nodes.wrap.classList.toggle("nodata", noData);
        nodes.name.textContent = config.name || text.name;
        nodes.badgeText.textContent = noData ? text.badge_nodata : (isOn ? text.badge_on : text.badge_off);

        if (config.error_entity) {
            const errorState = this._st(config.error_entity);
            const value = String(errorState?.state ?? "").toLowerCase();
            const hasError = Boolean(errorState) && !config.no_error_states.includes(value);
            nodes.errorBanner.classList.toggle("hidden", !hasError);
            if (hasError)
                nodes.errorText.textContent = `${text.error_title}: ${errorState.state}`;
        } else {
            nodes.errorBanner.classList.add("hidden");
        }

        let lightOn = false;
        if (config.light_entity) {
            lightOn = this._isLightOn(this._st(config.light_entity)?.state);
            nodes.lightBtn.classList.remove("hidden");
            nodes.lightBtn.classList.toggle("on", isOn && lightOn);
            nodes.lightBtn.title = isOn && lightOn ? text.light_on : text.light_off;
            nodes.lightIcon.setAttribute("icon", isOn && lightOn ? "mdi:lightbulb-on" : "mdi:lightbulb-off-outline");
        } else {
            nodes.lightBtn.classList.add("hidden");
        }

        nodes.cvGlow.setAttribute("opacity", isOn && lightOn ? ".55" : (isOn ? ".15" : "0"));

        if (this._dualZoneVisual) {
            nodes.cvDisplayText.textContent = `${this._displayTemp(1, isOn)} / ${this._displayTemp(2, isOn)}`;
        } else {
            const zone = this._zoneConfigured(1) ? 1 : (this._zoneConfigured(2) ? 2 : null);
            nodes.cvDisplayText.textContent = zone ? this._displayTemp(zone, isOn) : "N/A";
        }

        this._updateZone(1, isOn);
        this._updateZone(2, isOn);

        let anyInfo = false;

        const envValue = config.env_temp_entity ? this._num(config.env_temp_entity) : null;
        anyInfo = this._updateInfoItem(
                "envItem", "envValue",
                Boolean(config.env_temp_entity),
                isOn && envValue !== null,
`${this._fmtNum(envValue, 1)} °C`) || anyInfo;

        const modeState = config.mode_entity ? this._st(config.mode_entity) : undefined;
        const modeRaw = modeState?.state;
        const modeNames = config.mode_names || {};
        const hasCustomModeNames = Object.keys(modeNames).length > 0;
        const modeLabel = hasCustomModeNames && modeRaw !== undefined && modeRaw !== null && Object.prototype.hasOwnProperty.call(modeNames, modeRaw)
             ? modeNames[modeRaw]
             : modeRaw;
        anyInfo = this._updateInfoItem(
                "modeItem", "modeValue",
                Boolean(config.mode_entity),
                isOn && modeRaw !== undefined && modeRaw !== null,
                modeLabel) || anyInfo;

        const programState = config.program_name_entity ? this._st(config.program_name_entity) : undefined;
        const programRaw = String(programState?.state ?? "").toLowerCase();
        anyInfo = this._updateInfoItem(
                "programItem", "programValue",
                Boolean(config.program_name_entity),
                isOn && !WineCellarCard.NO_PROGRAM_STATES.includes(programRaw),
                programState?.state) || anyInfo;

        const powerValue = config.power_entity ? this._num(config.power_entity) : null;
        anyInfo = this._updateInfoItem(
                "powerItem", "powerValue",
                Boolean(config.power_entity),
                isOn && powerValue !== null,
                `${this._fmtNum(powerValue, 0)} W`) || anyInfo;

        nodes.infoPanel.classList.toggle("hidden", !anyInfo);
    }

    _updateZone(zone, isOn) {
        const config = this._config;
        const nodes = this._nodes;
        const panel = nodes[`zone${zone}Panel`];

        if (!this._zoneConfigured(zone)) {
            panel.classList.add("hidden");
            return;
        }

        panel.classList.remove("hidden");
        const tempEntity = config[`zone${zone}_temp_entity`];
        const targetEntity = config[`zone${zone}_target_entity`];
        const humidityEntity = config[`zone${zone}_humidity_entity`];
        const temp = tempEntity ? this._num(tempEntity) : null;
        const target = targetEntity ? this._num(targetEntity) : null;
        const humidity = humidityEntity ? this._num(humidityEntity) : null;
        const min = Number(config[`zone${zone}_min`]);
        const max = Number(config[`zone${zone}_max`]);

        nodes[`zone${zone}Temp`].textContent = isOn && temp !== null ? this._fmtNum(temp, 1) : "N/A";
        const fraction = isOn && temp !== null && max !== min ? (temp - min) / (max - min) : 0;
        nodes[`zone${zone}Arc`].setAttribute("stroke-dasharray", this._ringDasharray(fraction));

        nodes[`zone${zone}Target`].innerHTML = targetEntity
             ? (isOn && target !== null ? `${this._t.target}: <b>${this._fmtNum(target, 1)} °C</b>` : `${this._t.target}: <b>N/A</b>`)
             : "";

        if (humidityEntity) {
            nodes[`zone${zone}HumidityRow`].classList.remove("hidden");
            nodes[`zone${zone}Humidity`].textContent = isOn && humidity !== null ? `${Math.round(humidity)}%` : "N/A";
        } else {
            nodes[`zone${zone}HumidityRow`].classList.add("hidden");
        }
    }
}

class WineCellarCardEditor extends HTMLElement {
    static SELECT_OPTIONS = {
        cellar_visual_position: [{
                value: "left",
                label: "Left"
            }, {
                value: "center",
                label: "Center"
            }, {
                value: "right",
                label: "Right"
            },
        ],
    };

    static AUTO_LANGUAGE = "auto";

    static SELECT_DEFAULTS = {
        language: WineCellarCardEditor.AUTO_LANGUAGE,
        cellar_visual_position: WineCellarCard.DEFAULTS.cellar_visual_position,
    };

    static SECTION_ICONS = {
        general: "mdi:cog-outline",
        zone1: "mdi:numeric-1-circle-outline",
        zone2: "mdi:numeric-2-circle-outline",
        extra: "mdi:puzzle-outline",
    };

    static PLACEHOLDER_TEXT_KEYS = {
        name: "name",
    };

    constructor() {
        super();
        this._rendered = false;
        this._modeNamesTimer = null;
        this._focusedElements = new Set();
    }

    setConfig(config) {
        this._config = {
            ...config
        };
        if (!this._rendered) {
            this._render();
            this._rendered = true;
        }
        this._updateValues();
    }

    set hass(hass) {
        this._hass = hass;
        if (!this._rendered) {
            this._render();
            this._rendered = true;
        }
        this._updateValues();
    }

    disconnectedCallback() {
        if (this._modeNamesTimer)
            clearTimeout(this._modeNamesTimer);
    }

    _languageOptions() {
        const codes = Object.keys(WineCellarCard.STRINGS);
        return [{
                value: WineCellarCardEditor.AUTO_LANGUAGE,
                label: "Automatic (Home Assistant language)"
            },
            ...codes.map((code) => ({
                    value: code,
                    label: WineCellarCard.languageDisplayName(code),
                })),
        ];
    }

    _defaultStrings() {
        const strings = WineCellarCard.STRINGS;
        const configured = String(this._config?.language || "").toLowerCase();
        if (configured && strings[configured])
            return strings[configured];
        const profileLanguage = (
            this._hass?.locale?.language || this._hass?.language || "").toLowerCase();
        if (profileLanguage) {
            if (strings[profileLanguage])
                return strings[profileLanguage];
            const base = profileLanguage.split(/[-_]/)[0];
            if (strings[base])
                return strings[base];
        }
        return strings.en;
    }

    _sectionSummary(icon, title) {
        return `<summary><span class="section-title"><ha-icon icon="${icon}"></ha-icon>${title}</span></summary>`;
    }

    _render() {
        const icons = WineCellarCardEditor.SECTION_ICONS;
        this.innerHTML = `
      <style>
        .editor { display: grid; gap: 12px; padding: 8px 0; }
        details.section {
          overflow: hidden;
          background: var(--ha-card-background, var(--card-background-color));
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-card-border-radius,12px);
        }
        summary {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 16px; color: var(--primary-text-color);
          font-size: 16px; font-weight: 600; cursor: pointer;
          list-style: none; user-select: none;
        }
        summary::-webkit-details-marker { display: none; }
        .section-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .section-title ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); flex-shrink: 0; }
        summary::after {
          content: ""; width: 8px; height: 8px; flex-shrink: 0;
          border-right: 2px solid var(--secondary-text-color);
          border-bottom: 2px solid var(--secondary-text-color);
          transform: rotate(45deg); transition: transform .2s ease;
        }
        details[open] summary::after { transform: rotate(225deg); }
        details[open] summary { border-bottom: 1px solid var(--divider-color); }
        .section-content { display: grid; gap: 14px; padding: 16px; }
        .grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
        .entity-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        label, .field { display: grid; gap: 6px; color: var(--secondary-text-color); font-size: 12px; }
        input, textarea {
          box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px 10px;
          color: var(--primary-text-color);
          background: var(--ha-card-background, var(--card-background-color));
          border: 1px solid var(--divider-color); border-radius: 8px; font: inherit;
        }
        textarea {
          min-height: 112px; resize: vertical; line-height: 1.5;
          font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Consolas, monospace);
        }
        ha-entity-picker, ha-selector { display: block; width: 100%; }
        .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 42px; }
        .switch-text { display: grid; gap: 3px; min-width: 0; }
        .switch-label { color: var(--primary-text-color); font-size: 14px; }
        .field-description { color: var(--secondary-text-color); font-size: 12px; line-height: 1.4; }
        ha-switch { flex-shrink: 0; }
        @media (max-width:600px) { .grid { grid-template-columns: 1fr; } }
      </style>

      <div class="editor">
        <details class="section" open>
          ${this._sectionSummary(icons.general, "General")}
          <div class="section-content"><div class="entity-grid">
            <label>Card name<input data-config="name" type="text"></label>
            ${this._entityPicker("status_entity", "Status entity", ["binary_sensor"])}
            <div class="field"><span>Language</span><ha-selector data-config="language"></ha-selector></div>
            <div class="field"><span>Cellar illustration position</span><ha-selector data-config="cellar_visual_position"></ha-selector></div>
            <div class="switch-row">
              <div class="switch-text"><span class="switch-label">Hide cellar illustration</span><span class="field-description">Hide the cellar illustration and enlarge the temperature zones.</span></div>
              <ha-switch data-config="hide_cellar_visual"></ha-switch>
            </div>
          </div></div>
        </details>

        ${this._zoneSection(1)}
        ${this._zoneSection(2)}

        <details class="section">
          ${this._sectionSummary(icons.extra, "Additional entities")}
          <div class="section-content"><div class="entity-grid">
            ${this._entityPicker("error_entity", "Error entity", ["sensor"])}
            ${this._entityPicker("light_entity", "Light entity", ["binary_sensor", "light", "switch"])}
            ${this._entityPicker("env_temp_entity", "Environment temperature", ["sensor"])}
            ${this._entityPicker("mode_entity", "Mode entity", ["sensor", "select", "input_select"])}
            <label>
              Mode names
              <textarea data-config="mode_names" spellcheck="false" placeholder="'0': '-'
'1': Standard
'2': Eco"></textarea>
              <span class="field-description">One mapping per line, format: code: label. Defaults to '0': -, '1': Standard, '2': Eco when left unconfigured. Clear the field to show the mode entity's raw, untranslated value on the card instead.</span>
            </label>
            ${this._entityPicker("program_name_entity", "Program name entity", ["sensor"])}
            ${this._entityPicker("power_entity", "Power entity", ["sensor"])}
          </div></div>
        </details>
      </div>
    `;

        this._initializeEntityPickers();
        this._initializeSelectFields();
        this._initializeStandardFields();
    }

    _entityPicker(key, label, domains = []) {
        return `<div class="field"><span>${label}</span><ha-entity-picker data-config="${key}" data-domains="${domains.join(',')}" allow-custom-entity></ha-entity-picker></div>`;
    }

    _zoneSection(zone) {
        const defaults = WineCellarCard.DEFAULTS;
        const icon = WineCellarCardEditor.SECTION_ICONS[`zone${zone}`];
        return `
      <details class="section">
        ${this._sectionSummary(icon, `Zone ${zone}`)}
        <div class="section-content">
          <div class="entity-grid">
            <label>Label<input data-config="zone${zone}_label" type="text" placeholder="ZONE ${zone}"></label>
            ${this._entityPicker(`zone${zone}_temp_entity`, "Temperature entity", ["sensor"])}
            ${this._entityPicker(`zone${zone}_target_entity`, "Target temperature entity", ["sensor", "number"])}
            ${this._entityPicker(`zone${zone}_humidity_entity`, "Humidity entity", ["sensor"])}
          </div>
          <div class="grid">
            <label>Minimum temperature<input data-config="zone${zone}_min" type="number" step="0.5" placeholder="${defaults[`zone${zone}_min`]}"></label>
            <label>Maximum temperature<input data-config="zone${zone}_max" type="number" step="0.5" placeholder="${defaults[`zone${zone}_max`]}"></label>
          </div>
        </div>
      </details>
    `;
    }

    _initializeEntityPickers() {
        this.querySelectorAll("ha-entity-picker[data-config]").forEach((picker) => {
            picker.hass = this._hass;
            picker.allowCustomEntity = true;
            const domains = picker.dataset.domains?.split(",").filter(Boolean);
            if (domains?.length)
                picker.includeDomains = domains;
            picker.addEventListener("value-changed", (event) => this._valueChanged(event));
        });
    }

    _initializeSelectFields() {
        this.querySelectorAll("ha-selector[data-config]").forEach((selector) => {
            const key = selector.dataset.config;
            const options = key === "language"
                 ? this._languageOptions()
                 : WineCellarCardEditor.SELECT_OPTIONS[key] || [];

            selector.hass = this._hass;
            selector.selector = {
                select: {
                    mode: "dropdown",
                    options,
                },
            };
            selector.addEventListener("value-changed", (event) => this._valueChanged(event));
        });
    }

    _initializeStandardFields() {
        this.querySelectorAll("input[data-config], textarea[data-config]").forEach((element) => {
            element.addEventListener("input", (event) => this._valueChanged(event));
            element.addEventListener("focus", () => this._focusedElements.add(element));
            element.addEventListener("blur", () => this._focusedElements.delete(element));
        });
        this.querySelectorAll("ha-switch[data-config]").forEach((element) => {
            element.addEventListener("change", (event) => this._valueChanged(event));
        });
    }

    _updateValues() {
        if (!this._rendered || !this._config)
            return;

        this.querySelectorAll("[data-config]").forEach((element) => {
            const key = element.dataset.config;
            const value = this._config[key];

            if (element.tagName === "HA-ENTITY-PICKER") {
                element.hass = this._hass;
                element.value = value ?? "";
                return;
            }
            if (element.tagName === "HA-SELECTOR") {
                element.hass = this._hass;
                const isEmpty = value === undefined || value === null || value === "";
                const fallback = WineCellarCardEditor.SELECT_DEFAULTS[key];
                element.value = (isEmpty && fallback !== undefined) ? fallback : (value ?? "");
                return;
            }
            if (element.tagName === "HA-SWITCH") {
                element.checked = value === true;
                return;
            }
            if (element.tagName === "TEXTAREA" && key === "mode_names") {
                if (!this._focusedElements.has(element)) {
                    const modeNames = value !== undefined ? value : WineCellarCard.STUB_MODE_NAMES;
                    element.value = this._formatModeNames(modeNames);
                }
                return;
            }

            const placeholderKey = WineCellarCardEditor.PLACEHOLDER_TEXT_KEYS[key];
            if (placeholderKey)
                element.placeholder = this._defaultStrings()[placeholderKey];

            if (!this._focusedElements.has(element))
                element.value = value ?? "";
        });
    }

    _formatModeNames(modeNames) {
        if (!modeNames || typeof modeNames !== "object" || Array.isArray(modeNames))
            return "";
        return Object.entries(modeNames).map(([key, label]) => `'${key}': ${label}`).join("\n");
    }

    _parseModeNames(text) {
        const result = {};
        String(text ?? "").split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                return;
            const separator = trimmed.indexOf(":");
            if (separator < 0)
                return;
            const key = trimmed.slice(0, separator).trim().replace(/^['"]|['"]$/g, "");
            const label = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
            if (key)
                result[key] = label;
        });
        return result;
    }

    _valueChanged(event) {
        if (!this._config)
            return;
        const target = event.currentTarget;
        const key = target?.dataset?.config;
        if (!key)
            return;

        let value;
        if (target.tagName === "HA-ENTITY-PICKER" || target.tagName === "HA-SELECTOR") {
            value = event.detail?.value ?? target.value ?? "";
            if (key === "language" && value === WineCellarCardEditor.AUTO_LANGUAGE)
                value = "";
        } else if (target.tagName === "HA-SWITCH") {
            value = Boolean(target.checked);
        } else if (target.tagName === "TEXTAREA" && key === "mode_names") {
            value = this._parseModeNames(target.value);
        } else if (target.type === "number") {
            value = target.value === "" ? undefined : Number(target.value);
        } else {
            value = target.value;
        }

        const config = {
            ...this._config,
            [key]: value
        };

        if (value === "" || value === undefined)
            delete config[key];
        this._config = config;

        const emit = () => this.dispatchEvent(new CustomEvent("config-changed", {
                detail: {
                    config: {
                        ...this._config
                    }
                },
                bubbles: true,
                composed: true,
            }));

        if (key === "mode_names") {
            if (this._modeNamesTimer)
                clearTimeout(this._modeNamesTimer);
            this._modeNamesTimer = setTimeout(emit, 250);
        } else {
            emit();
        }
    }
}

if (!customElements.get("wine-cellar-card-editor")) {
    customElements.define("wine-cellar-card-editor", WineCellarCardEditor);
}
if (!customElements.get("wine-cellar-card")) {
    customElements.define("wine-cellar-card", WineCellarCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "wine-cellar-card")) {
    window.customCards.push({
        type: "wine-cellar-card",
        name: "Wine Cellar Card",
        description: "Dual-zone wine cellar card with temperature, humidity, light, mode and errors",
        preview: true,
        documentationURL: "https://github.com/KroFR/wine-cellar-ha-card",
    });
}

console.info(`%c 🍷 WINE-CELLAR-CARD %c v${CARD_VERSION} `, "color: white; background: #7a2038; font-weight: 700;", "color: #7a2038; background: white; font-weight: 700;");
