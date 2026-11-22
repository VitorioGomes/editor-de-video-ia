// Usado só pelo "npm run studio" (a prévia no navegador). O render sai pelos scripts/, que têm as mesmas opções.
import { Config } from "@remotion/cli/config";
Config.setChromiumOpenGlRenderer("angle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
