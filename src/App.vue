<script>
	import { setupAuthInterceptor, checkAuthOnLaunch } from '@/utils/auth-guard'

	export default {
		onLaunch: function() {
			setupAuthInterceptor()
			checkAuthOnLaunch()
		},
		onShow: function() {
		},
		onHide: function() {
		}
	}
</script>

<style lang="scss">
	// Import global fonts (CSS output - must use @import, not @use)
	@import '@/uni.scss';

	// Global page styles (applied to all pages)
	page {
		font-family: $font-family;
		background-color: var(--app-page-bg, #{$bg-light});
		color: $text-primary;
		font-size: $uni-font-size-base;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		transition: background-color 0.15s ease;
	}

	@media (prefers-color-scheme: dark) {
		page:not([data-force-light]) {
			background-color: var(--app-page-bg, #{$bg-dark});
		}
	}

	// Global utility classes
	.text-primary {
		color: $text-primary;
	}

	.text-secondary {
		color: $text-secondary;
	}

	.text-tertiary {
		color: $text-tertiary;
	}

	.bg-light {
		background-color: $bg-light;
	}

	// Hide scrollbar utility (for horizontal scroll containers)
	.hide-scrollbar {
		@include hide-scrollbar;
	}

	// Light mode: full fade-in transition
	.study-page,
	.life-page,
	.teaching-page,
	.psychology-page,
	.mine-page {
		animation: page-enter var(--page-transition-duration, 280ms) ease both;
		will-change: opacity, transform;
	}

	// Dark mode: softer transition to prevent white flash
	.study-page.theme-dark,
	.life-page.theme-dark,
	.teaching-page.theme-dark,
	.psychology-page.theme-dark,
	.mine-page.theme-dark {
		animation-name: page-enter-dark;
	}
</style>
