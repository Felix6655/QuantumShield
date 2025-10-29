"use client";

import React, { useState, useMemo, useEffect } from "react";
type Props = {
  // add props if you need them later
};
function clickAndRevoke(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

export default function KemBox(_props: Props) {
  // example state (remove if unused)
  const [dummy] = useState(false);
  useEffect(() => { void dummy; }, [dummy]);

  return (
    <div className="kem-box">
      <p>KEM demo panel</p>
    </div>
  );
}
