"use client";

import { MessageResponse } from "./message";
import type { ComponentProps } from "react";

export type ResponseProps = ComponentProps<typeof MessageResponse>;

export const Response = ({ children, ...props }: ResponseProps) => (
  <MessageResponse {...props}>{children}</MessageResponse>
);
