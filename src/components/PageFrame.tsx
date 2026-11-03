import { useEffect, type ReactNode } from "react";
import { installControlReveal } from "../control-reveal";
import DotField from "./DotField";
import MosaicTransitions from "./MosaicTransitions";

export default function PageFrame({ home, children }: { home: boolean; children: ReactNode }) {
  useEffect(installControlReveal, []);
  return <>{home && <DotField/>}<MosaicTransitions/>{children}</>;
}
