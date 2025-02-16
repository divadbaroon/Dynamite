import { memo } from 'react'
import { CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const HeaderComponent = () => (
  <CardHeader className="flex-shrink-0 space-y-2">
    <CardTitle className="text-2xl font-bold text-center">Discussion Guide</CardTitle>
    <Separator />
  </CardHeader>
);

HeaderComponent.displayName = 'Header';
export const Header = memo(HeaderComponent);