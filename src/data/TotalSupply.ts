import { BigNumber } from '@ethersproject/bignumber'
import { Token, TokenAmount } from '@swapr/sdk'
import ERC20_INTERFACE from '../constants/abis/erc20'
import { useTokenContract } from '../hooks/useContract'
import { useSingleCallResult, useMultipleContractSingleData } from '../state/multicall/hooks'

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Token): TokenAmount | undefined {
  const contract = useTokenContract(token?.address, false)

  const totalSupply: BigNumber = useSingleCallResult(contract, 'totalSupply')?.result?.[0]

  return token && totalSupply ? new TokenAmount(token, totalSupply.toString()) : undefined
}

export function useTotalSupplies(tokens?: Token[]): (TokenAmount | undefined)[] {
  const totalSupplies = useMultipleContractSingleData(
    tokens?.map(token => token?.address) || [],
    ERC20_INTERFACE,
    'totalSupply'
  ).map(r => r.result?.[0]) as TokenAmount[]

  if (!tokens) return []

  const tokenAmounts: (TokenAmount | undefined)[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const balance = totalSupplies[i]
    tokenAmounts[i] = balance ? new TokenAmount(token, balance.toString()) : undefined
  }

  return tokenAmounts
}
