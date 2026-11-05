import type { MotionData } from "@/lib/types";

export function motionCss(motion: MotionData | null) {
  if (!motion || motion.level === "none") return "";
  const lively = motion.level === "lively";
  const rules = ["@media (prefers-reduced-motion: no-preference) {"];
  if (motion.hover) {
    rules.push(
      "a,button,article{transition:transform .28s ease,box-shadow .28s ease}",
    );
    rules.push(
      `article:hover,a:hover{transform:translateY(${lively ? "-6px" : "-2px"})}`,
    );
  }
  if (motion.enter) {
    const distance = lively ? "18px" : "8px";
    const duration = lively ? ".8s" : ".5s";
    rules.push(
      `@keyframes yz-rise{from{opacity:0;transform:translateY(${distance})}to{opacity:1;transform:none}}`,
    );
    rules.push(`section,article{animation:yz-rise ${duration} ease both}`);
    if (lively) {
      rules.push(
        "section:nth-child(2){animation-delay:.06s}section:nth-child(3){animation-delay:.12s}section:nth-child(4){animation-delay:.18s}",
      );
    }
  }
  if (motion.scroll) rules.push("html{scroll-behavior:smooth}");
  rules.push("}");
  return rules.join("\n");
}
