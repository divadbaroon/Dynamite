import { useState, useEffect } from "react"
import { toast } from "sonner"
import { getUserById, updateUserConsent } from "@/lib/actions/user"
import { SupabaseUser, UserData } from "@/types"

export function useUserConsent(user: SupabaseUser | null) {
    const [userData, setUserData] = useState<UserData | null>(null)
    const [hasConsented, setHasConsented] = useState<boolean | null>(null)
    const [isProcessingConsent, setIsProcessingConsent] = useState(false)
    const [isLoadingConsent, setIsLoadingConsent] = useState(true)
  
    useEffect(() => {
      const checkUserConsent = async () => {
        if (!user) {
          setIsLoadingConsent(false)
          return
        }
        
        setIsLoadingConsent(true)
        try {
          const data = await getUserById(user.id)
          if (data) {
            setUserData(data as UserData)
            setHasConsented(data.consent_status ?? false)
          }
        } catch (error) {
          console.log('Error fetching user consent:', error)
          setHasConsented(false)
        } finally {
          setIsLoadingConsent(false)
        }
      }
    
      checkUserConsent()
    }, [user])
  
    const handleConsent = async (hasConsented: boolean) => {
      if (!user) return
      
      setIsProcessingConsent(true)
      try {
        await updateUserConsent({
          user_id: user.id,
          consent_status: hasConsented
        })
        setHasConsented(hasConsented)
      } catch (error) {
        console.log('Error updating consent:', error)
        toast.error("Failed to update consent status")
      } finally {
        setIsProcessingConsent(false)
      }
    }
  
    return { 
      userData, 
      hasConsented, 
      isProcessingConsent, 
      isLoadingConsent,
      handleConsent 
    }
  }