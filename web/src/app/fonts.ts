import { Pacifico, Quicksand } from "next/font/google";

const pacifico = Pacifico({
  subsets: ["latin", "vietnamese"],
  weight: "400",
  display: "swap",
  variable: "--font-pacifico",
});

const quicksand = Quicksand({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-quicksand",
});

/** Class names for `<html>`: they define the font CSS variables that globals.css uses. */
export const fontClassName = `${pacifico.variable} ${quicksand.variable}`;
