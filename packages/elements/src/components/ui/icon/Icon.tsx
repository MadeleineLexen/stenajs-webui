import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  FontAwesomeIcon,
  Props as FontAwesomeProps
} from "@fortawesome/react-fontawesome";
import { Omit, ThemeColorField, useThemeFields } from "@stenajs-webui/core";
import * as React from "react";

export interface IconProps
  extends Omit<FontAwesomeProps, "color" | "size" | "icon"> {
  icon?: IconDefinition;
  color?: ThemeColorField | string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({
  className,
  color = "primaryTextLight",
  flip,
  icon,
  pulse,
  rotation,
  size = 20,
  spin,
  style,
  transform
}) => {
  const { colors } = useThemeFields(
    {
      colors: {
        iconColor: color
      }
    },
    []
  );

  if (!icon) {
    return null;
  }

  return (
    <FontAwesomeIcon
      className={className}
      color={colors.iconColor}
      flip={flip}
      icon={icon}
      pulse={pulse}
      rotation={rotation}
      spin={spin}
      style={{ fontSize: size, ...style }}
      transform={transform}
    />
  );
};
