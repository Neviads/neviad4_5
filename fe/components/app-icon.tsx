import type { IconProps } from "@mingcute/react";
import {
  Book4Regular,
  ClipboardRegular,
  CloseRegular,
  Flask3Regular,
  Grid2Regular,
  LayoutGridRegular,
  MenuRegular,
  PicRegular,
  QuestionRegular,
  ScienceRegular,
  SendRegular,
  SparklesRegular,
} from "@mingcute/react/core-regular";

export type AppIconName =
  | "sparkles"
  | "atom"
  | "flask"
  | "clipboard"
  | "layout"
  | "book"
  | "grid"
  | "help"
  | "menu"
  | "close"
  | "image"
  | "send";

const icons = {
  sparkles: SparklesRegular,
  atom: ScienceRegular,
  flask: Flask3Regular,
  clipboard: ClipboardRegular,
  layout: LayoutGridRegular,
  book: Book4Regular,
  grid: Grid2Regular,
  help: QuestionRegular,
  menu: MenuRegular,
  close: CloseRegular,
  image: PicRegular,
  send: SendRegular,
};

export function AppIcon({ name, className, ...props }: { name: AppIconName } & IconProps) {
  const Icon = icons[name];
  return <Icon size="1em" className={className} {...props} />;
}
