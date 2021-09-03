import React, { useCallback, useEffect, useState } from 'react'
import { CurrencyAmount } from '@swapr/sdk'
import styled from 'styled-components'
import { useActiveWeb3React } from '../../../hooks'
import { ButtonPrimary } from '../../Button'
import { InjectedConnector } from '@web3-react/injected-connector'
import { AutoColumn } from '../../Column'

const StyledClaimButton = styled(ButtonPrimary)`
  color: ${props => props.theme.white} !important;
  background: linear-gradient(90deg, ${props => props.theme.primary1} -24.77%, #fb52a1 186.93%);
  :disabled {
    opacity: 0.5;
  }
`

interface ActionButtonProps {
  availableClaim: boolean
  nativeCurrencyBalance?: CurrencyAmount
  correctNetwork: boolean
  isOldSwprLp: boolean
  onConnectWallet: () => void
  onSwitchToArbitrum: () => void
  onClaim: () => void
}

export function ActionButton({
  availableClaim,
  nativeCurrencyBalance,
  correctNetwork,
  isOldSwprLp,
  onConnectWallet,
  onSwitchToArbitrum,
  onClaim
}: ActionButtonProps) {
  const { account, chainId, connector } = useActiveWeb3React()

  const [disabled, setDisabled] = useState(true)
  const [text, setText] = useState('Claim SWPR')

  useEffect(() => {
    let localDisabled = true
    if (!!!account) localDisabled = false
    // this else if handles cases where no airdrop nor conversion is available,
    // or when the user is in the correct network but no native currency
    // balance is there
    else if (correctNetwork && isOldSwprLp) localDisabled = false
    else if (!availableClaim || (correctNetwork && nativeCurrencyBalance?.equalTo('0'))) localDisabled = true
    else localDisabled = false
    setDisabled(localDisabled)
  }, [account, availableClaim, chainId, correctNetwork, isOldSwprLp, nativeCurrencyBalance])

  useEffect(() => {
    let buttonText = 'Claim SWPR'
    if (!!!account) buttonText = 'Connect wallet'
    else if (!correctNetwork) buttonText = 'Switch to Arbitrum'
    else if (isOldSwprLp) buttonText = 'Pull liquidity'
    else if (availableClaim) buttonText = 'Claim SWPR'
    setText(buttonText)
  }, [account, availableClaim, correctNetwork, isOldSwprLp])

  const handleLocalClick = useCallback(() => {
    if (!account) onConnectWallet()
    else if (!correctNetwork && connector instanceof InjectedConnector) onSwitchToArbitrum()
    else if (isOldSwprLp) {
      const anchor = document.createElement('a')
      Object.assign(anchor, {
        target: '_blank',
        href: 'https://ipfs.io/ipfs/Qmeg3BPGzBqitsEcm8dLaMrS44aD6EiGWPLtGMBjHbPyea',
        rel: 'noopener noreferrer'
      }).click()
      anchor.remove()
    } else if (availableClaim) onClaim()
  }, [account, onConnectWallet, correctNetwork, connector, onSwitchToArbitrum, isOldSwprLp, availableClaim, onClaim])

  return (
    <AutoColumn gap="16px">
      <StyledClaimButton disabled={disabled} padding="16px 16px" width="100%" mt="1rem" onClick={handleLocalClick}>
        {text}
      </StyledClaimButton>
      {availableClaim && 'The claimed tokens will need to be converted in the next step'}
    </AutoColumn>
  )
}
