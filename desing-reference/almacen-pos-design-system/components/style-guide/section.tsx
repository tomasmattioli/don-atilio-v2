"use client"

import type { ReactNode } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

export function GuideSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Box component="section" sx={{ mb: 6 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ color: "secondary.dark", mb: 0.5 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ maxWidth: 640 }}>
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  )
}

export default GuideSection
