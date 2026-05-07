type Props = {
  presetId: string;
  className?: string;
};

const ink = "#2a1f17";

function CuteNpc() {
  return (
    <>
      <circle cx="26" cy="26" r="22" fill="#fbcfe8" stroke={ink} strokeWidth="2" />
      <circle cx="19" cy="23" r="3" fill={ink} />
      <circle cx="33" cy="23" r="3" fill={ink} />
      <circle cx="20" cy="22" r="1" fill="#fff" />
      <circle cx="34" cy="22" r="1" fill="#fff" />
      <path d="M19 33 Q26 38 33 33" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      <circle cx="13" cy="32" r="2.5" fill="#f472b6" opacity=".7" />
      <circle cx="39" cy="32" r="2.5" fill="#f472b6" opacity=".7" />
    </>
  );
}

function RobotGuard() {
  return (
    <>
      <line x1="26" y1="2" x2="26" y2="8" stroke={ink} strokeWidth="2" />
      <circle cx="26" cy="2.5" r="2" fill="#22c55e" stroke={ink} strokeWidth="1.5" />
      <rect x="6" y="10" width="40" height="38" rx="6" fill="#bbf7d0" stroke={ink} strokeWidth="2" />
      <rect x="14" y="20" width="8" height="6" fill={ink} />
      <rect x="30" y="20" width="8" height="6" fill={ink} />
      <rect x="15" y="21" width="2" height="4" fill="#22c55e" />
      <rect x="31" y="21" width="2" height="4" fill="#22c55e" />
      <rect x="18" y="34" width="16" height="3" fill={ink} />
      <rect x="20" y="34" width="2" height="3" fill="#bbf7d0" />
      <rect x="24" y="34" width="2" height="3" fill="#bbf7d0" />
      <rect x="28" y="34" width="2" height="3" fill="#bbf7d0" />
    </>
  );
}

function SoftMascot() {
  return (
    <>
      <circle cx="26" cy="26" r="22" fill="#fecdd3" stroke={ink} strokeWidth="2" />
      <ellipse cx="19" cy="24" rx="3.5" ry="4" fill={ink} />
      <ellipse cx="33" cy="24" rx="3.5" ry="4" fill={ink} />
      <circle cx="20.5" cy="22" r="1.5" fill="#fff" />
      <circle cx="34.5" cy="22" r="1.5" fill="#fff" />
      <ellipse cx="13" cy="32" rx="3" ry="2" fill="#fb7185" opacity=".6" />
      <ellipse cx="39" cy="32" rx="3" ry="2" fill="#fb7185" opacity=".6" />
      <path d="M21 35 Q26 38 31 35" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function TalkativeMerchant() {
  return (
    <>
      <circle cx="26" cy="26" r="22" fill="#fef08a" stroke={ink} strokeWidth="2" />
      <path d="M15 22 Q19 19 23 22" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="33" cy="23" r="3" fill={ink} />
      <circle cx="34" cy="22" r="1" fill="#fff" />
      <ellipse cx="26" cy="35" rx="5" ry="3.5" fill={ink} />
      <ellipse cx="26" cy="36.5" rx="3" ry="1.5" fill="#fb7185" />
      <path d="M40 18 L46 16 M40 22 L46 22" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function TinyCreature() {
  return (
    <>
      <circle cx="26" cy="28" r="20" fill="#bae6fd" stroke={ink} strokeWidth="2" />
      <circle cx="20" cy="26" r="2" fill={ink} />
      <circle cx="32" cy="26" r="2" fill={ink} />
      <path d="M22 33 Q26 36 30 33 L30 38 Q26 41 22 38 Z" fill="#fb7185" stroke={ink} strokeWidth="2" />
      <line x1="10" y1="14" x2="14" y2="18" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="14" x2="38" y2="18" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="22" x2="11" y2="22" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="22" x2="41" y2="22" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function ForestSpirit() {
  return (
    <>
      <path d="M26 4 Q34 6 32 14 Q26 12 26 4 Z" fill="#14b8a6" stroke={ink} strokeWidth="2" />
      <circle cx="26" cy="28" r="20" fill="#99f6e4" stroke={ink} strokeWidth="2" />
      <path d="M16 25 Q19 22 22 25" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M30 25 Q33 22 36 25" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M21 35 Q26 37 31 35" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function TiredVillager() {
  return (
    <>
      <circle cx="26" cy="26" r="22" fill="#fde68a" stroke={ink} strokeWidth="2" />
      <path d="M14 22 Q19 26 24 22" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 22 Q33 26 38 22" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="19" cy="25" r="1.5" fill={ink} />
      <circle cx="33" cy="25" r="1.5" fill={ink} />
      <path d="M20 36 Q26 33 32 36" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      <text x="38" y="14" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill={ink}>z</text>
      <text x="42" y="20" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" fill={ink}>z</text>
    </>
  );
}

function Monster() {
  return (
    <>
      <path
        d="M6 30 L10 14 L16 24 L22 12 L28 24 L34 12 L40 24 L46 14 L46 38 Q26 50 6 38 Z"
        fill="#fecaca"
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="14" y1="20" x2="22" y2="24" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="20" x2="30" y2="24" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="19" cy="26" r="2" fill="#ef4444" />
      <circle cx="33" cy="26" r="2" fill="#ef4444" />
      <path
        d="M16 34 L20 38 L24 34 L28 38 L32 34 L36 38"
        fill="none"
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="38" y1="32" x2="42" y2="36" stroke={ink} strokeWidth="1.5" />
    </>
  );
}

function DeepBoss() {
  return (
    <>
      <path
        d="M10 8 L14 14 L20 6 L26 14 L32 6 L38 14 L42 8 L42 18 L10 18 Z"
        fill="#fde68a"
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="11" r="1.5" fill="#ef4444" />
      <circle cx="26" cy="9" r="1.5" fill="#7c3aed" />
      <circle cx="32" cy="11" r="1.5" fill="#22c55e" />
      <circle cx="26" cy="32" r="16" fill="#ddd6fe" stroke={ink} strokeWidth="2" />
      <ellipse cx="20" cy="30" rx="3" ry="2.5" fill="#fde68a" stroke={ink} strokeWidth="2" />
      <ellipse cx="32" cy="30" rx="3" ry="2.5" fill="#fde68a" stroke={ink} strokeWidth="2" />
      <circle cx="20" cy="30" r="1.2" fill={ink} />
      <circle cx="32" cy="30" r="1.2" fill={ink} />
      <path d="M20 38 Q26 40 32 38" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

const faces: Record<string, () => JSX.Element> = {
  "cute-npc": CuteNpc,
  "robot-guard": RobotGuard,
  "soft-mascot": SoftMascot,
  "talkative-merchant": TalkativeMerchant,
  "tiny-creature": TinyCreature,
  "forest-spirit": ForestSpirit,
  "tired-villager": TiredVillager,
  monster: Monster,
  "deep-boss": DeepBoss,
};

export const newPresetIds = new Set<string>([
  "soft-mascot",
  "talkative-merchant",
  "forest-spirit",
  "deep-boss",
]);

export function PresetFace({ presetId, className }: Props) {
  const Face = faces[presetId] ?? CuteNpc;
  return (
    <svg className={className} viewBox="0 0 52 52" aria-hidden="true">
      <Face />
    </svg>
  );
}
