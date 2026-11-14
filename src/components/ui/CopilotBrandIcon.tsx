import {
  BRAND_ICON_IS_CUSTOM,
  COPILOT_AGENT_ICON_PATH,
  COPILOT_AGENT_ICON_SVG,
  COPILOT_AGENT_ICON_TRANSFORM,
} from "@/constants";
import { cn } from "@/lib/utils";
import React from "react";

interface CopilotBrandIconProps {
  className?: string;
}

export const CopilotBrandIcon: React.FC<CopilotBrandIconProps> = ({ className }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={cn("tw-shrink-0", className)}
    {...(BRAND_ICON_IS_CUSTOM
      ? { dangerouslySetInnerHTML: { __html: COPILOT_AGENT_ICON_SVG } }
      : {})}
  >
    {BRAND_ICON_IS_CUSTOM ? null : (
      <g transform={COPILOT_AGENT_ICON_TRANSFORM}>
        <path fill="currentColor" d={COPILOT_AGENT_ICON_PATH} />
      </g>
    )}
  </svg>
);
