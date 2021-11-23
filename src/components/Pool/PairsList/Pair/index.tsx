import React from 'react'

import { CurrencyAmount, Percent, Token } from '@swapr/sdk'
import { MEDIA_WIDTHS, TYPE } from '../../../../theme'
import DoubleCurrencyLogo from '../../../DoubleLogo'
import { DarkCard } from '../../../Card'
import styled from 'styled-components'
import ApyBadge from '../../ApyBadge'

import { formatCurrencyAmount } from '../../../../utils'

import { unwrappedToken } from '../../../../utils/wrappedCurrency'
import { ReactComponent as CarrotLogo } from '../../../../assets/svg/carrot.svg'
import { MouseoverTooltip } from '../../../Tooltip'
import { useWindowSize } from '../../../../hooks/useWindowSize'
import { Flex, Text } from 'rebass'

const SizedCard = styled(DarkCard)`
  //THIS SHOULD BE TOOGLEABLE 210PX OR 100% DEPENDING ON LAYOUT CHOSEN
  width: 100%;
  /* height: 120px; */
  padding: 17.5px 20px;
  overflow: hidden;
  ${props => props.theme.mediaWidth.upToMedium`
    width: 100%;
  `}
  ${props => props.theme.mediaWidth.upToExtraSmall`
    height: initial;
    padding: 22px 16px;
  `}
`

const PositiveBadgeRoot = styled.div`
  height: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(14, 159, 110, 0.1);
  border-radius: 4px;
  padding: 0 4px;
`

const KpiBadge = styled.div`
  height: 16px;
  border: solid 1.5px #f2994a;
  color: #f2994a;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  line-height: 9px;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  padding: 0 4px;
`

const StyledCarrotLogo = styled(CarrotLogo)`
  margin-right: 4px;
  > path {
    fill: #f2994a;
  }
`

const BadgeText = styled.div`
  font-weight: 600;
  font-size: 9px;
  line-height: 11px;
  letter-spacing: 0.02em;
  color: ${props => props.theme.green2};
`

const EllipsizedText = styled(TYPE.body)`
  overflow: hidden;
  text-overflow: ellipsis;
`

const TitleText = styled.div`
  color: ${props => props.theme.purple2};
  font-size: 10px;
  font-weight: 600;
  line-height: 12px;
  opacity: 0.5;
`
const ValueText = styled.div`
  color: ${props => props.theme.purple2};
  font-size: 14px;
  font-weight: 500;
  line-height: 16.8px;
  font-family: 'Fira Code';
`
const ItemsWrapper = styled(Flex)`
  justify-content: space-evenly;
  flex-direction: column;
`

interface PairProps {
  token0?: Token
  token1?: Token
  apy: Percent
  usdLiquidity: CurrencyAmount
  usdLiquidityText?: string
  staked?: boolean
  containsKpiToken?: boolean
}

export default function Pair({
  token0,
  token1,
  usdLiquidity,
  apy,
  staked,
  containsKpiToken,
  usdLiquidityText,
  ...rest
}: PairProps) {
  console.log(token0, token1, usdLiquidity, apy, staked, containsKpiToken, usdLiquidityText)
  const { width } = useWindowSize()
  const isMobile = width ? width < MEDIA_WIDTHS.upToExtraSmall : false

  return (
    <SizedCard selectable {...rest}>
      <Flex height="100%" justifyContent="space-between">
        <Flex flexDirection={isMobile ? 'column' : 'row'} alignItems={!isMobile ? 'center' : ''}>
          {isMobile ? (
            <DoubleCurrencyLogo
              spaceBetween={-12}
              marginLeft={-23}
              top={-25}
              currency0={token0}
              currency1={token1}
              size={64}
            />
          ) : (
            <DoubleCurrencyLogo marginRight={14} currency0={token0} currency1={token1} size={45} />
          )}

          <EllipsizedText color="white" lineHeight="20px" fontWeight="700" fontSize="16px" maxWidth="100%">
            {unwrappedToken(token0)?.symbol}
            {isMobile ? '/' : <br></br>}
            {unwrappedToken(token1)?.symbol}
          </EllipsizedText>

          {isMobile && (
            <TYPE.subHeader fontSize="9px" color="text4" lineHeight="14px" letterSpacing="2%" fontWeight="600">
              ${formatCurrencyAmount(usdLiquidity)} {usdLiquidityText?.toUpperCase() || 'LIQUIDITY'}
            </TYPE.subHeader>
          )}
        </Flex>
        <Flex width={isMobile ? 'auto' : '65%'} justifyContent="space-between">
          <Flex flexDirection="column" alignItems="flex-start" justifyContent={isMobile ? '' : 'space-evenly'}>
            {!isMobile && <TitleText>CAMPAIGNS</TitleText>}

            <Flex style={{ gap: '6px' }} flexDirection={isMobile ? 'column' : 'row'}>
              {apy.greaterThan('0') && (
                <Flex alignSelf={isMobile ? 'center' : 'flex-start'} marginLeft="auto">
                  <ApyBadge upTo={containsKpiToken} apy={apy} />
                </Flex>
              )}
              {containsKpiToken && (
                <MouseoverTooltip content="Rewards at least a Carrot KPI token">
                  <KpiBadge>
                    <StyledCarrotLogo />
                    CARROT
                  </KpiBadge>
                </MouseoverTooltip>
              )}
              {staked && (
                <PositiveBadgeRoot>
                  <BadgeText>STAKING</BadgeText>
                </PositiveBadgeRoot>
              )}
            </Flex>
          </Flex>
          {!isMobile && (
            <>
              <ItemsWrapper>
                <TitleText>TVL</TitleText>
                <ValueText> $19 980 211</ValueText>
              </ItemsWrapper>
              <ItemsWrapper>
                <TitleText>24h VOLUME</TitleText>
                <ValueText>$128 581</ValueText>
              </ItemsWrapper>
              <ItemsWrapper>
                <TitleText>APY</TitleText>

                <Text fontWeight="700" fontSize="18px" fontFamily="Fira Code">
                  124%
                </Text>
              </ItemsWrapper>
            </>
          )}
        </Flex>
      </Flex>
    </SizedCard>
  )
}
