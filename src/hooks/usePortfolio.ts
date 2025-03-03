import { CurrencyAmount, /* LiquidityMiningCampaign, PricedTokenAmount, */ TokenAmount, USD } from '@swapr/sdk'
import { ethers } from 'ethers'
import { useMemo } from 'react'
import { useActiveWeb3React } from '.'
import { useTotalSupplies } from '../data/TotalSupply'
import { useTokenBalances } from '../state/wallet/hooks'
import { useLiquidityMiningCampaignPositions } from './useLiquidityMiningCampaignPosition'
import { useLPPairs, LiquidityPosition } from './useLiquidityPositions'

export interface Portfolio {
  [contractAddress: string]: UserAsset | undefined
}

interface UserAsset {
  token: TokenAmount
  usd: CurrencyAmount
}

const computeLiquidityPosition = (
  position: LiquidityPosition,
  totalSupply: TokenAmount | undefined,
  userBalance: TokenAmount | undefined
) => {
  if (!userBalance || !totalSupply) return
  const userShare = userBalance.divide(totalSupply)
  const userToken0 = new TokenAmount(
    position.pair.token0,
    ethers.utils
      .parseUnits(position.pair.reserve0.multiply(userShare).toFixed(position.pair.token0.decimals))
      .toString()
  )
  const userToken1 = new TokenAmount(
    position.pair.token1,
    ethers.utils
      .parseUnits(position.pair.reserve1.multiply(userShare).toFixed(position.pair.token1.decimals))
      .toString()
  )
  const userLiquidityUSD = CurrencyAmount.usd(
    ethers.utils.parseUnits(position.liquidityUSD.multiply(userShare).toFixed(USD.decimals)).toString()
  )

  return {
    position,
    userToken0,
    userToken1,
    userLiquidityUSD
  }
}

/*
interface StakedLiquidityMiningPosition {
  campaign: LiquidityMiningCampaign
  userStakedToken0: PricedTokenAmount
  userStakedToken1: PricedTokenAmount
  userStakedLiquidityUSD: CurrencyAmount
}
*/

// Get all LP pairs
// Map LP Pairs to corresponding Liquidity Tokens array
// Retreive Total Supply and User Balances for all Liquidity Tokens
// Return Memoized reduction to Asset Token -> User Balance map
export const usePortfolio = () => {
  const { account } = useActiveWeb3React()
  const { data } = useLPPairs(account || undefined)

  const stakedCampaigns = data ? data.filter(d => d.staked).flatMap(d => d.pair.liquidityMiningCampaigns) : undefined
  const lpTokens = data ? data.map(d => d.pair.liquidityToken) : undefined

  const totalSupplies = useTotalSupplies(lpTokens)
  const balances = useTokenBalances(account || undefined, lpTokens)
  const stakedPositions = useLiquidityMiningCampaignPositions(stakedCampaigns)

  const computedPairs = useMemo(() => {
    if (!data || !totalSupplies || !balances) return undefined

    return data.map((d, index) => {
      return computeLiquidityPosition(d, totalSupplies[index], balances[d.pair.liquidityToken.address])
    })
  }, [data, totalSupplies, balances])

  return useMemo(() => {
    if (!computedPairs || !stakedPositions) return { portfolio: undefined, pairs: undefined }

    const portfolioBalances: Portfolio = {}

    computedPairs.concat()

    computedPairs.forEach(userPosition => {
      if (!userPosition) return
      const t0Address = userPosition.userToken0.token.address
      const t1Address = userPosition.userToken1.token.address

      let bals0 = portfolioBalances[t0Address]
      let bals1 = portfolioBalances[t1Address]

      const { parseUnits } = ethers.utils

      if (bals0) {
        bals0.token = bals0?.token?.add(userPosition.userToken0) || userPosition.userToken0
        bals0.usd = bals0.usd?.add(
          CurrencyAmount.usd(parseUnits(userPosition.userLiquidityUSD.divide('2').toFixed(5)).toString())
        )
      } else {
        bals0 = {
          token: userPosition.userToken0,
          usd: CurrencyAmount.usd(parseUnits(userPosition.userLiquidityUSD.divide('2').toFixed(5)).toString())
        }
        portfolioBalances[t0Address] = bals0
      }
      if (bals1) {
        bals1.token = bals1?.token?.add(userPosition.userToken1) || userPosition.userToken1
        bals1.usd = bals1.usd?.add(
          CurrencyAmount.usd(parseUnits(userPosition.userLiquidityUSD.divide('2').toSignificant(5)).toString())
        )
      } else {
        bals1 = {
          token: userPosition.userToken1,
          usd: CurrencyAmount.usd(parseUnits(userPosition.userLiquidityUSD.divide('2').toSignificant(5)).toString())
        }
        portfolioBalances[t1Address] = bals1
      }
    })

    stakedPositions.forEach(position => {
      if (!position) return
    })

    return { portfolio: portfolioBalances, pairs: computedPairs }
  }, [computedPairs, stakedPositions])
}
