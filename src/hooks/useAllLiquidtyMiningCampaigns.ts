import { gql, useQuery } from '@apollo/client'

import { Pair, Token, TokenAmount } from '@swapr/sdk'
import { useMemo } from 'react'
import { useActiveWeb3React } from '.'
import { SubgraphLiquidityMiningCampaign, SubgraphSingleSidedStakingCampaign } from '../apollo'
import { useNativeCurrency } from './useNativeCurrency'

import { toLiquidityMiningCampaign, toSingleSidedStakeCampaign } from '../utils/liquidityMining'
import { DateTime, Duration } from 'luxon'
import { useAllTokensFromActiveListsOnCurrentChain } from '../state/lists/hooks'
import { getAddress, parseUnits } from 'ethers/lib/utils'
import { useKpiTokens } from './useKpiTokens'
import { PairsFilterType } from '../components/Pool/ListFilter'

// Fragments are not possible, they will be resovled
const CAMPAIGN_REWARDS_TOKEN_COMMON_FIEDLDS = ['address: id', 'name', 'symbol', 'decimals', 'derivedNativeCurrency']

const CAMPAIGN_COMMON_FIEDLDS = ['duration', 'startsAt', 'endsAt', 'locked', 'stakingCap', 'stakedAmount']

const SINGLE_SIDED_CAMPAIGNS = gql`
  query($userId: ID) {
    singleSidedStakingCampaigns {
      id
      owner
      ${CAMPAIGN_COMMON_FIEDLDS.join('\r\n')}
      stakeToken {
        id
        symbol
        name
        decimals
        totalSupply
        derivedNativeCurrency
      }
      rewards {
        token {
          ${CAMPAIGN_REWARDS_TOKEN_COMMON_FIEDLDS.join('\r\n')}
        }
        amount
      }
      singleSidedStakingPositions(where: { stakedAmount_gt: 0, user: $userId }) {
        id
      }
    }
  }
`
const REGULAR_CAMPAIGN = gql`
  query($userId: ID) {
    liquidityMiningCampaigns {
      address: id
      ${CAMPAIGN_COMMON_FIEDLDS.join('\r\n')}
      rewards {
        token {
          ${CAMPAIGN_REWARDS_TOKEN_COMMON_FIEDLDS.join('\r\n')}
        }
        amount
      }
      stakablePair {
        id
        reserveNativeCurrency
        reserveUSD
        totalSupply
        reserve0
        reserve1
        token0 {
          address: id
          name
          symbol
          decimals
        }
        token1 {
          address: id
          name
          symbol
          decimals
        }
      }
      liquidityMiningPositions(where: { stakedAmount_gt: 0, user: $userId }) {
        id
      }
    }
  }
`

export function useAllLiquidtyMiningCampaigns(
  pair?: Pair,
  dataFilter?: PairsFilterType
): {
  loading: boolean
  miningCampaigns: any
} {
  const token0Address = useMemo(() => (pair ? pair.token0?.address.toLowerCase() : undefined), [pair])
  const token1Address = useMemo(() => (pair ? pair.token1?.address.toLowerCase() : undefined), [pair])
  const pairAddress = useMemo(() => (pair ? pair.liquidityToken.address.toLowerCase() : undefined), [pair])

  const { chainId, account } = useActiveWeb3React()
  const nativeCurrency = useNativeCurrency()
  const timestamp = useMemo(() => Math.floor(Date.now() / 1000), [])
  const lowerTimeLimit = DateTime.utc()
    .minus(Duration.fromObject({ days: 150 }))
    .toJSDate()

  const memoizedLowerTimeLimit = useMemo(() => Math.floor(lowerTimeLimit.getTime() / 1000), [lowerTimeLimit])
  const tokensInCurrentChain = useAllTokensFromActiveListsOnCurrentChain()

  const { data: singleSidedCampaigns, loading: singleSidedLoading, error: singleSidedCampaignsError } = useQuery<{
    singleSidedStakingCampaigns: SubgraphSingleSidedStakingCampaign[]
  }>(SINGLE_SIDED_CAMPAIGNS, {
    variables: {
      userId: account?.toLowerCase()
    }
  })

  const { data: pairCampaigns, loading: campaignLoading, error: campaignError } = useQuery<{
    liquidityMiningCampaigns: SubgraphLiquidityMiningCampaign[]
  }>(REGULAR_CAMPAIGN, {
    variables: {
      userId: account?.toLowerCase()
    }
  })
  const kpiTokenAddresses = useMemo(() => {
    if (!pairCampaigns) return []
    return pairCampaigns.liquidityMiningCampaigns.flatMap(campaign =>
      campaign.rewards.map(reward => reward.token.address.toLowerCase())
    )
  }, [pairCampaigns])
  const { loading: loadingKpiTokens, kpiTokens } = useKpiTokens(kpiTokenAddresses)

  return useMemo(() => {
    if (singleSidedLoading || chainId === undefined || campaignLoading) {
      return { loading: true, miningCampaigns: { active: [], expired: [] } }
    }
    if (
      singleSidedCampaignsError ||
      campaignError ||
      !singleSidedCampaigns ||
      !singleSidedCampaigns.singleSidedStakingCampaigns ||
      !pairCampaigns ||
      !pairCampaigns.liquidityMiningCampaigns ||
      loadingKpiTokens
    ) {
      return { loading: true, miningCampaigns: { active: [], expired: [] } }
    }
    const expiredCampaigns = []
    const activeCampaigns = []
    for (let i = 0; i < pairCampaigns.liquidityMiningCampaigns.length; i++) {
      const camapaign = pairCampaigns.liquidityMiningCampaigns[i]

      if (
        (pairAddress && camapaign.stakablePair.id.toLowerCase() !== pairAddress) ||
        (dataFilter === PairsFilterType.MY && camapaign.liquidityMiningPositions.length === 0)
      )
        continue

      const { reserveNativeCurrency, totalSupply, token0, token1, reserve0, reserve1 } = camapaign.stakablePair
      const containsKpiToken = !!camapaign.rewards.find(
        reward => !!kpiTokens.find(kpiToken => kpiToken.address.toLowerCase() === reward.token.address.toLowerCase())
      )
      const token0ChecksummedAddress = getAddress(token0.address)
      const token1ChecksummedAddress = getAddress(token1.address)

      const tokenA =
        tokensInCurrentChain &&
        tokensInCurrentChain[token0ChecksummedAddress] &&
        tokensInCurrentChain[token0ChecksummedAddress].token
          ? tokensInCurrentChain[token0ChecksummedAddress].token
          : new Token(chainId, token0ChecksummedAddress, parseInt(token0.decimals), token0.symbol, token0.name)
      const tokenAmountA = new TokenAmount(tokenA, parseUnits(reserve0, token0.decimals).toString())

      const tokenB =
        tokensInCurrentChain &&
        tokensInCurrentChain[token1ChecksummedAddress] &&
        tokensInCurrentChain[token1ChecksummedAddress].token
          ? tokensInCurrentChain[token1ChecksummedAddress].token
          : new Token(chainId, token1ChecksummedAddress, parseInt(token1.decimals), token1.symbol, token1.name)
      const tokenAmountB = new TokenAmount(tokenB, parseUnits(reserve1, token1.decimals).toString())
      const pair = new Pair(tokenAmountA, tokenAmountB)
      const liquditiyCampaign = toLiquidityMiningCampaign(
        chainId,
        pair,
        totalSupply,
        reserveNativeCurrency,
        kpiTokens,
        camapaign,
        nativeCurrency
      )
      const hasStake = camapaign.liquidityMiningPositions.length > 0
      const isExpired = parseInt(camapaign.endsAt) < timestamp || parseInt(camapaign.endsAt) > memoizedLowerTimeLimit

      if (liquditiyCampaign.currentlyActive) {
        activeCampaigns.push({ campaign: liquditiyCampaign, staked: hasStake, containsKpiToken: containsKpiToken })
      } else if (isExpired) {
        expiredCampaigns.push({ campaign: liquditiyCampaign, staked: hasStake, containsKpiToken: containsKpiToken })
      }
    }

    for (let i = 0; i < singleSidedCampaigns.singleSidedStakingCampaigns.length; i++) {
      const camapaign = singleSidedCampaigns.singleSidedStakingCampaigns[i]

      if (
        (token0Address &&
          token1Address &&
          camapaign.stakeToken.id.toLowerCase() !== token0Address &&
          camapaign.stakeToken.id.toLowerCase() !== token1Address) ||
        (dataFilter === PairsFilterType.MY && camapaign.singleSidedStakingPositions.length === 0)
      )
        continue
      const containsKpiToken = !!camapaign.rewards.find(
        reward => !!kpiTokens.find(kpiToken => kpiToken.address.toLowerCase() === reward.token.address.toLowerCase())
      )
      const stakeToken = new Token(
        chainId,
        camapaign.stakeToken.id,
        parseInt(camapaign.stakeToken.decimals),
        camapaign.stakeToken.symbol,
        camapaign.stakeToken.name
      )
      const singleSidedStakeCampaign = toSingleSidedStakeCampaign(
        chainId,
        camapaign,
        stakeToken,
        camapaign.stakeToken.totalSupply,
        nativeCurrency,
        camapaign.stakeToken.derivedNativeCurrency
      )
      const hasStake = camapaign.singleSidedStakingPositions.length > 0
      const isExpired = parseInt(camapaign.endsAt) < timestamp || parseInt(camapaign.endsAt) > memoizedLowerTimeLimit

      if (hasStake || singleSidedStakeCampaign.currentlyActive) {
        activeCampaigns.unshift({
          campaign: singleSidedStakeCampaign,
          staked: hasStake,
          containsKpiToken: containsKpiToken
        })
      } else if (isExpired) {
        expiredCampaigns.unshift({
          campaign: singleSidedStakeCampaign,
          staked: hasStake,
          containsKpiToken: containsKpiToken
        })
      }
    }

    return {
      loading: false,
      miningCampaigns: { active: activeCampaigns, expired: expiredCampaigns }
    }
  }, [
    dataFilter,
    token1Address,
    token0Address,
    singleSidedCampaigns,
    singleSidedLoading,
    singleSidedCampaignsError,
    chainId,
    nativeCurrency,
    timestamp,
    memoizedLowerTimeLimit,
    kpiTokens,
    tokensInCurrentChain,
    loadingKpiTokens,
    campaignLoading,
    campaignError,
    pairAddress,
    pairCampaigns
  ])
}
