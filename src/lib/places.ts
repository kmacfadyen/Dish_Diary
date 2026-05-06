export async function searchGooglePlaces(query: string): Promise<Array<{
  google_place_id: string
  name: string
  address: string
  cuisine: string
  rating?: number
}>> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY

  if (!apiKey) {
    console.warn('No VITE_GOOGLE_PLACES_KEY — using mock results')
    return mockSearch(query)
  }

  try {
    return await searchViaNewAPI(query, apiKey)
  } catch (e) {
    console.error('Places API error:', e)
    return mockSearch(query)
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places?.Place) {
      resolve()
      return
    }
    // Remove any existing script to avoid duplicates
    const existing = document.querySelector('script[data-maps]')
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.setAttribute('data-maps', 'true')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

async function searchViaNewAPI(query: string, apiKey: string): Promise<any[]> {
  await loadGoogleMapsScript(apiKey)

  const { Place, SearchNearbyRankPreference } = (window as any).google.maps.places

  const request = {
    textQuery: query + ' restaurant',
    fields: ['displayName', 'formattedAddress', 'id', 'rating', 'types'],
    maxResultCount: 5,
  }

  try {
    const { places } = await Place.searchByText(request)

    if (!places || places.length === 0) return mockSearch(query)

    return places.map((place: any) => ({
      google_place_id: place.id,
      name: place.displayName,
      address: place.formattedAddress ?? '',
      cuisine: extractCuisine(place.types ?? []),
      rating: place.rating,
    }))
  } catch (e) {
    console.error('Place.searchByText error:', e)
    // Fall back to legacy API if new one fails
    return searchViaLegacyAPI(query)
  }
}

function searchViaLegacyAPI(query: string): Promise<any[]> {
  return new Promise((resolve) => {
    try {
      const service = new (window as any).google.maps.places.PlacesService(
        document.createElement('div')
      )
      service.textSearch(
        { query: query + ' restaurant', type: 'restaurant' },
        (results: any[], status: string) => {
          if (status !== 'OK' || !results) { resolve(mockSearch(query)); return }
          resolve(results.slice(0, 5).map((place: any) => ({
            google_place_id: place.place_id,
            name: place.name,
            address: place.formatted_address ?? '',
            cuisine: extractCuisine(place.types ?? []),
            rating: place.rating,
          })))
        }
      )
    } catch {
      resolve(mockSearch(query))
    }
  })
}

function extractCuisine(types: string[]): string {
  const map: Record<string, string> = {
    japanese_restaurant: 'Japanese',
    italian_restaurant: 'Italian',
    mexican_restaurant: 'Mexican',
    chinese_restaurant: 'Chinese',
    thai_restaurant: 'Thai',
    indian_restaurant: 'Indian',
    french_restaurant: 'French',
    greek_restaurant: 'Greek',
    korean_restaurant: 'Korean',
    vietnamese_restaurant: 'Vietnamese',
    american_restaurant: 'American',
    mediterranean_restaurant: 'Mediterranean',
    spanish_restaurant: 'Spanish',
  }
  for (const t of types) {
    if (map[t]) return map[t]
  }
  return 'Restaurant'
}

function mockSearch(query: string) {
  return [
    { google_place_id: `mock-1-${query}`, name: query, address: '123 Main St', cuisine: 'Restaurant' },
    { google_place_id: `mock-2-${query}`, name: `${query} Bistro`, address: '456 Oak Ave', cuisine: 'Restaurant' },
    { google_place_id: `mock-3-${query}`, name: `The ${query}`, address: '789 Elm Blvd', cuisine: 'Restaurant' },
  ]
}
