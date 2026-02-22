// components/ui/Text.js
import { Text as RNText } from "react-native";

export default function Text({ weight = "regular", style, className, ...props }) {
    let fontFamily = "DMSans_400Regular";
    if (weight === "medium") fontFamily = "DMSans_500Medium";
    if (weight === "bold") fontFamily = "DMSans_700Bold";
  
    return <RNText {...props} className={className} style={[{ fontFamily }, style]} />;
  }