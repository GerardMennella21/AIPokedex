import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  SimpleGrid,
  Spinner,
  Text,
  Wrap,
  WrapItem,
  Checkbox,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  VStack,
  Badge,
  Image as ChakraImage,
  Button,
} from "@chakra-ui/react";
import InfiniteScroll from "react-infinite-scroll-component";
import SearchBar from "../components/SearchBar";
import PokemonCard from "../components/PokemonCard";
import {
  getPokemonList,
  getAllPokemonBasicData,
  getPokemonListByType,
  getPokemon,
} from "../api/pokeApi";
import { capitalizeFirstLetter } from "../utils/helpers";
import { Link as RouterLink } from "react-router-dom";

const typeColors = {
  normal: "gray",
  fire: "red",
  water: "blue",
  grass: "green",
  electric: "yellow",
  ice: "cyan",
  fighting: "orange",
  poison: "purple",
  ground: "yellow",
  flying: "teal",
  psychic: "pink",
  bug: "green",
  rock: "orange",
  ghost: "purple",
  dark: "gray",
  dragon: "purple",
  steel: "gray",
  fairy: "pink",
};

const pokemonTypes = Object.keys(typeColors);

const AllPokemon = () => {
  const [pokemonList, setPokemonList] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalPokemonCount, setTotalPokemonCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [allPokemonList, setAllPokemonList] = useState([]);
  const [typeDataCache, setTypeDataCache] = useState({});

  const limit = 50;

  // Fetch all Pokémon names and IDs when the component mounts
  useEffect(() => {
    const fetchAllPokemon = async () => {
      const allPokemon = await getAllPokemonBasicData();
      setAllPokemonList(allPokemon);
    };
    fetchAllPokemon();
  }, []);

  // Fetch data when search term, filters, or allPokemonList change
  useEffect(() => {
    // Only fetch data if allPokemonList is loaded
    if (allPokemonList.length > 0) {
      setPokemonList([]);
      setOffset(0);
      setHasMore(true);
      fetchMoreData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedTypes, allPokemonList]);

  const fetchMoreData = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    let newPokemons = [];
    let totalCount = totalPokemonCount;
    const currentOffset = offset; // Capture current offset

    if (searchTerm || selectedTypes.length > 0) {
      if (allPokemonList.length === 0) {
        setLoading(false);
        return;
      }

      let filteredPokemonIds = allPokemonList.map((pokemon) => pokemon.id);

      // Apply search filter
      if (searchTerm) {
        filteredPokemonIds = allPokemonList
          .filter((pokemon) => pokemon.name.toLowerCase().includes(searchTerm))
          .map((pokemon) => pokemon.id);
      }

      // Apply type filters
      if (selectedTypes.length > 0) {
        const typeFilteredIdsList = await Promise.all(
          selectedTypes.map(async (type) => {
            if (typeDataCache[type]) {
              return typeDataCache[type];
            } else {
              const ids = await getPokemonListByType(type);
              setTypeDataCache((prevCache) => ({ ...prevCache, [type]: ids }));
              return ids;
            }
          })
        );

        // Find intersection of IDs if multiple types are selected
        let typeFilteredIds = typeFilteredIdsList[0];
        if (selectedTypes.length > 1) {
          typeFilteredIds = typeFilteredIdsList.reduce((acc, ids) =>
            acc.filter((id) => ids.includes(id))
          );
        }

        filteredPokemonIds = filteredPokemonIds.filter((id) =>
          typeFilteredIds.includes(id)
        );
      }

      // Get the next batch of IDs to fetch
      const nextIds = filteredPokemonIds.slice(currentOffset, currentOffset + limit);

      // Fetch detailed data for these Pokémon
      newPokemons = await Promise.all(
        nextIds.map(async (id) => {
          const data = await getPokemon(id);
          return data;
        })
      );

      totalCount = filteredPokemonIds.length;
    } else {
      // Default behavior: fetch next batch
      const result = await getPokemonList(limit, currentOffset);
      newPokemons = result.pokemonList;
      totalCount = result.totalCount;
    }

    if (totalPokemonCount === null) {
      setTotalPokemonCount(totalCount);
    }

    if (newPokemons.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    setPokemonList((prevList) => {
      const existingIds = new Set(prevList.map((p) => p.id));
      const uniqueNewPokemons = newPokemons.filter(
        (pokemon) => !existingIds.has(pokemon.id)
      );
      return [...prevList, ...uniqueNewPokemons];
    });

    setOffset((prevOffset) => prevOffset + limit);

    if (currentOffset + limit >= totalCount) {
      setHasMore(false);
    }

    setLoading(false);
  };

  const handleSearch = useCallback((term) => {
    setSearchTerm(term.toLowerCase());
  }, []);

  const handleTypeChange = (type) => {
    setSelectedTypes((prevTypes) => {
      if (prevTypes.includes(type)) {
        return prevTypes.filter((t) => t !== type);
      } else if (prevTypes.length < 2) {
        return [...prevTypes, type];
      } else {
        // Replace the oldest selected type
        return [prevTypes[1], type];
      }
    });
  };

  const handlePokemonClick = (pokemon) => {
    setSelectedPokemon(pokemon);
    onOpen();
  };

  return (
    <Box p={[2, 4, 6]} maxW="1200px" mx="auto" overflowX="hidden">
      <SearchBar onSearch={handleSearch} />
      {/* Type Filter */}
      <Wrap spacing={2} mb={4}>
        {pokemonTypes.map((type) => (
          <WrapItem key={type}>
            <Checkbox
              colorScheme={typeColors[type]}
              isChecked={selectedTypes.includes(type)}
              onChange={() => handleTypeChange(type)}
              textTransform="capitalize"
            >
              {type}
            </Checkbox>
          </WrapItem>
        ))}
      </Wrap>
      {pokemonList.length === 0 && !hasMore ? (
        <Text>No Pokémon found.</Text>
      ) : (
        <InfiniteScroll
          dataLength={pokemonList.length}
          next={fetchMoreData}
          hasMore={hasMore}
          loader={loading ? <Spinner size="xl" /> : null}
          endMessage={
            <Text textAlign="center" mt={4}>
              All Pokémon loaded!
            </Text>
          }
          className="hide-scrollbar"
          style={{ overflow: "visible" }}
        >
          {pokemonList.length > 0 ? (
            <SimpleGrid columns={[2, 3, 4]} spacing={6}>
              {pokemonList.map((pokemon) => (
                <PokemonCard
                  key={pokemon.id}
                  pokemon={pokemon}
                  onClick={handlePokemonClick}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Text>No Pokémon found.</Text>
          )}
        </InfiniteScroll>
      )}
      {/* Drawer Component */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          {selectedPokemon && (
            <>
              <DrawerHeader>
                {capitalizeFirstLetter(selectedPokemon.name)}
              </DrawerHeader>
              <DrawerBody>
                <VStack spacing={4} align="start">
                  <ChakraImage
                    src={selectedPokemon.sprites.front_default}
                    alt={selectedPokemon.name}
                    boxSize="150px"
                  />
                  <Text>
                    <strong>ID:</strong> #{selectedPokemon.id}
                  </Text>
                  <Text>
                    <strong>Type:</strong>{" "}
                    {selectedPokemon.types.map((typeInfo) => (
                      <Badge
                        key={typeInfo.slot}
                        colorScheme={typeColors[typeInfo.type.name]}
                        px={2}
                        py={1}
                        borderRadius="md"
                        textTransform="capitalize"
                        mr={1}
                      >
                        {typeInfo.type.name}
                      </Badge>
                    ))}
                  </Text>
                  {/* Add more general info as needed */}
                  <Button
                    as={RouterLink}
                    to={`/pokemon/${selectedPokemon.name}`}
                    colorScheme="teal"
                    mt={4}
                  >
                    View Details
                  </Button>
                </VStack>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default AllPokemon;
